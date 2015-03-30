var buffertools = require('buffertools');
var fs = require('fs');
var ref = require('ref');
var ffi = require('ffi');
var path = require('path');
var _ = require('underscore');

var ToxOptions = require(path.join(__dirname, 'toxoptions'));
var consts = require(path.join(__dirname, 'consts'));
var util = require(path.join(__dirname, 'util'));
// var size_t = util.size_t;

// Apparently node-ffi accepts strings for types larger than 32-bits...
// Base-10 strings? Trying this for now.
var size_t = function(num) { return num.toString(); };

buffertools.extend();

var ToxEnum = 'int32';

// Tox types
// IMPORTANT: proxy_type is not actually a size_t, but a C enum which appears
// to be 64-bits on my x64 machine. I'm not sure what the C standard says about
// how enums are compiled/represented in a compiled program, if anything.
var _Tox = ref.types.void;
var _ToxPtr = ref.refType(_Tox);
var _ToxOptionsPtr = ref.refType(ToxOptions);

// Common types
var _UInt8Ptr = ref.refType('uint8');
var _UInt16Ptr = ref.refType('uint16');
var _UInt32Ptr = ref.refType('uint32');
var _Int8Ptr = ref.refType('int8');
var _Int16Ptr = ref.refType('int16');
var _Int32Ptr = ref.refType('int32');
var _SizePtr = ref.refType('size_t');

// Tox error types
// IMPORTANT: These might not actually be uint8s, but it's not possible
// to be sure as it could vary depending on the compiler (probably?).
// Since the range of values should be far less than 256, treating as an
// uint8 should be fine for little-endian architectures.
var _ToxErrorType = ToxEnum; // See other IMPORTANT note about enums
var _ToxErrorNewPtr = ref.refType(_ToxErrorType);
var _ToxErrorBootstrapPtr = ref.refType(_ToxErrorType);
var _ToxErrorFriendCustomPacketPtr = ref.refType(_ToxErrorType);
var _ToxErrorGetPortPtr = ref.refType(_ToxErrorType);
var _ToxErrorOptionsNewPtr = ref.refType(_ToxErrorType);

/**
 * Creates a Tox instance.
 * @class
 * @param {Object} [opts] Options
 */
var Tox = function(opts) {
  if(!opts) opts = {};
  var libpath = opts['path'];

  this._library = this.createLibrary(libpath);

  this._options = this._createToxOptions(opts);
  this._initNew(this._options);
};

/**
 * Create a libtoxcore Library instance. If given a path, will use
 * the specified path.
 * @param {String} [libpath='libtoxcore'] - Path to libtoxcore
 * @return {ffi.Library}
 */
Tox.prototype.createLibrary = function(libpath) {
  libpath = libpath || 'libtoxcore';
  return ffi.Library(libpath, {
    'tox_add_tcp_relay':   [ 'bool', [ _ToxPtr, _Int8Ptr, 'uint16', _UInt8Ptr, _ToxErrorBootstrapPtr ] ],
    'tox_bootstrap':       [ 'bool', [ _ToxPtr, _Int8Ptr, 'uint16', _UInt8Ptr, _ToxErrorBootstrapPtr ] ],
    'tox_friend_send_lossless_packet': [ 'bool', [ _ToxPtr, 'uint32', _UInt8Ptr, 'size_t', _ToxErrorFriendCustomPacketPtr ] ],
    'tox_friend_send_lossy_packet':    [ 'bool', [ _ToxPtr, 'uint32', _UInt8Ptr, 'size_t', _ToxErrorFriendCustomPacketPtr ] ],
    'tox_iteration_interval': [ 'uint32', [ _ToxPtr ] ],
    'tox_iterate':         [ 'void' , [ _ToxPtr ] ],
    'tox_kill': [ 'void',  [ _ToxPtr ] ],
    'tox_new':  [ _ToxPtr, [ _ToxOptionsPtr, _UInt8Ptr, 'size_t', _ToxErrorNewPtr ] ],
    'tox_get_savedata':    [ 'void',  [ _ToxPtr, _UInt8Ptr ] ],
    'tox_get_savedata_size':  [ 'size_t',  [ _ToxPtr ] ],
    'tox_options_default': [ 'void', [ _ToxOptionsPtr ] ],
    'tox_options_free':    [ 'void', [ _ToxOptionsPtr ] ],
    'tox_options_new':     [ _ToxOptionsPtr, [ _ToxErrorOptionsNewPtr ] ],
    'tox_self_get_tcp_port': [ 'uint16', [ _ToxPtr, _ToxErrorGetPortPtr ] ],
    'tox_self_get_udp_port': [ 'uint16', [ _ToxPtr, _ToxErrorGetPortPtr ] ]
  });
};


///////////////////////////////////////
//> Wrapper methods for tox.h functions
///////////////////////////////////////


/**
 * Synchronous tox_options_free(3).
 * @param {ToxOptions} opts
 * @todo Async function
 */
Tox.prototype.freeOptionsSync = function(opts) {
  this.getLibrary().tox_options_free(opts.ref());
};

/**
 * Synchronous tox_options_new(3).
 * Allocate and initialize a new ToxOptions struct. Expects
 * the caller to eventually free.
 * @return {ToxOptions} Options
 * @todo Async function
 * @todo Error handling
 */
Tox.prototype.newOptionsSync = function() {
  var options = this.getLibrary().tox_options_new(ref.NULL);
  return options.deref();
};

/**
 * Asynchronous tox_bootstrap(3).
 * @param {String} address
 * @param {Number} port
 * @param {(Buffer|String)} publicKey
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.bootstrap = function(address, port, publicKey, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var eptr = ref.alloc(_ToxErrorType),
      args = this._fixBootstrapArgs(address, port, publicKey),
      address = args[0], port = args[1], publicKey = args[2],
      _this = this;

  this.getLibrary().tox_bootstrap.async(this.getHandle(), address, port, publicKey, eptr, function(err, res) {
    var terr = _this._getToxBootstrapError(eptr.deref());
    if(!err && terr) {
      err = terr;
    }

    if(!err && !res) {
      err = _this._getToxNotSuccessfulError();
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_bootstrap(3).
 * @param {String} address
 * @param {Number} port
 * @param {(Buffer|String)} publicKey
 * @throws Error if tox_bootstrap errors or returns false
 */
Tox.prototype.bootstrapSync = function(address, port, publicKey) {
  this._checkHandleSync();

  var eptr = ref.alloc(_ToxErrorType),
      args = this._fixBootstrapArgs(address, port, publicKey),
      address = args[0], port = args[1], publicKey = args[2];

  var success = this.getLibrary().tox_bootstrap(this.getHandle(), address, port, publicKey, eptr);

  var terr = this._getToxBootstrapError(eptr.deref());
  if(terr) throw terr;

  if(!success) {
    throw this._getToxNotSuccessfulError();
  }
};

/**
 * Asynchronous tox_self_get_udp_port(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getUdpPort = function(callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var eptr = ref.alloc(_ToxErrorType),
      _this = this;

  this.getLibrary().tox_self_get_udp_port.async(this.getHandle(), eptr, function(err, res) {
    var terr = _this._getToxGetPortError(eptr.deref());
    if(!err && terr) {
      err = terr;
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_self_get_udp_port(3).
 * @returns {Number} Port
 * @throws Error if TOX_ERR_GET_PORT set.
 */
Tox.prototype.getUdpPortSync = function() {
  this._checkHandleSync();

  var eptr = ref.alloc(_ToxErrorType),
      port = this.getLibrary().tox_self_get_udp_port(this.getHandle(), eptr);

  var err = this._getToxGetPortError(eptr.deref());
  if(err) throw err;

  return port;
};

/**
 * Asynchronous tox_self_get_tcp_port(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getTcpPort = function(callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var eptr = ref.alloc(_ToxErrorType),
      _this = this;

  this.getLibrary().tox_self_get_tcp_port.async(this.getHandle(), eptr, function(err, res) {
    var terr = _this._getToxGetPortError(eptr.deref());
    if(!err && terr) {
      err = terr;
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_self_get_tcp_port(3).
 * @returns {Number} Port
 * @throws Error if TOX_ERR_GET_PORT set.
 */
Tox.prototype.getTcpPortSync = function() {
  this._checkHandleSync();

  var eptr = ref.alloc(_ToxErrorType),
      port = this.getLibrary().tox_self_get_tcp_port(this.getHandle(), eptr);

  var err = this._getToxGetPortError(eptr.deref());
  if(err) throw err;

  return port;
};

/**
 * Asynchronous tox_friend_send_lossless_packet(3).
 * @untested
 * @param {Number} friendnum
 * @param {Buffer} data
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.sendLosslessPacket = function(friendnum, data, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var eptr = ref.alloc(_ToxErrorType),
      _this = this;

  this.getLibrary().tox_friend_send_lossless_packet.async(
    this.getHandle(), friendnum, data, size_t(data.length), eptr, function(err, res) {
    var terr = _this._getToxFriendCustomPacketError(eptr.deref());
    if(!err && terr) {
      err = terr;
    }

    if(!err && !res) {
      err = _this._getToxNotSuccessfulError();
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_friend_send_lossless_packet(3).
 * @untested
 * @param {Number} friendnum
 * @param {Buffer} data
 * @throws Error if TOX_ERR_FRIEND_CUSTOM_PACKET set
 * @throws Error if tox_friend_send_lossless_packet returns false
 */
Tox.prototype.sendLosslessPacketSync = function(friendnum, data) {
  this._checkHandleSync();

  var eptr = ref.alloc(_ToxErrorType),
      success = this.getLibrary().tox_friend_send_lossless_packet(
        this.getHandle(), friendnum, data, size_t(data.length), eptr);

  var err = this._getToxFriendCustomPacketError(eptr.deref());
  if(err) throw err;

  if(!success) {
    throw this._getToxNotSuccessfulError();
  }
};

/**
 * Asynchronous tox_friend_send_lossy_packet(3).
 * @untested
 * @param {Number} friendnum
 * @param {Buffer} data
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.sendLossyPacket = function(friendnum, data, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var eptr = ref.alloc(_ToxErrorType),
      _this = this;

  this.getLibrary().tox_friend_send_lossy_packet.async(
    this.getHandle(), friendnum, data, size_t(data.length), eptr, function(err, res) {
    var terr = _this._getToxFriendCustomPacketError(eptr.deref());
    if(!err && terr) {
      err = terr;
    }

    if(!err && !res) {
      err = _this._getToxNotSuccessfulError();
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_friend_send_lossy_packet(3).
 * @untested
 * @param {Number} friendnum
 * @param {Buffer} data
 * @throws Error if TOX_ERR_FRIEND_CUSTOM_PACKET set
 * @throws Error if tox_friend_send_lossy_packet returns false
 */
Tox.prototype.sendLossyPacketSync = function(friendnum, data) {
  this._checkHandleSync();

  var eptr = ref.alloc(_ToxErrorType),
      success = this.getLibrary().tox_friend_send_lossy_packet(
        this.getHandle(), friendnum, data, size_t(data.length), eptr);

  var err = this._getToxFriendCustomPacketError(eptr.deref());
  if(err) throw err;

  if(!success) {
    throw this._getToxNotSuccessfulError();
  }
};

/**
 * Asynchronous tox_iteration_interval(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.iterationInterval = function(callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_iteration_interval.async(this.getHandle(), callback);
};

/**
 * Synchronous tox_iteration_interval(3).
 * @return {Number} milliseconds until the next tox_iterate should occur
 */
Tox.prototype.iterationIntervalSync = function() {
  this._checkHandleSync();
  return this.getLibrary().tox_iteration_interval(this.getHandle());
};

/**
 * Asynchronous tox_iterate(3).
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.iterate = function(callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_iterate(this.getHandle(), callback);
};

/**
 * Synchronous tox_iterate(3).
 */
Tox.prototype.iterateSync = function() {
  this._checkHandleSync();
  this.getLibrary().tox_iterate(this.getHandle());
};

/**
 * Asynchronous tox_kill(3). Will also set handle to undefined.
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.kill = function(callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var _this = this;
  this.getLibrary().tox_kill.async(this.getHandle(), function(err) {
    if(!err) {
      _this._handle = undefined;
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_kill(3). Will also set handle to undefined.
 */
Tox.prototype.killSync = function() {
  this._checkHandleSync();
  this.getLibrary().tox_kill(this.getHandle());
  this._handle = undefined;
};


/////////////////////////////
//> Other convenience methods
/////////////////////////////


/**
 * Get the handle object.
 * @return {Object}
 */
Tox.prototype.getHandle = function() {
  return this._handle;
};

/**
 * Whether or not this Tox instance has a handle.
 * @return {Boolean} true if handle, false if none
 */
Tox.prototype.hasHandle = function() {
  return !!this.getHandle();
};

/**
 * Get the internal Library instance.
 * @return {ffi.Library}
 */
Tox.prototype.getLibrary = function() {
  return this._library;
};

/**
 * Frees the ToxOptions and calls tox_kill synchronously.
 */
Tox.prototype.free = function() {
  this.freeOptionsSync(this._options);
  this._options = undefined;
  this.killSync();
};

/**
 * Get the ToxOptions.
 * @return {ToxOptions}
 */
Tox.prototype.getOptions = function() {
  var options = this._options;

  return {
    ipv6_enabled: options.ipv6_enabled,
    udp_enabled: options.udp_enabled,
    proxy_type: options.proxy_type,
    proxy_address: ref.reinterpretUntilZeros(options.proxy_address, ref.types.char.size).toString(),
    proxy_port: options.proxy_port,
    start_port: options.start_port,
    end_port: options.end_port
  };
};

/**
 * Check whether or not an iterateSync loop is running.
 * @return {Boolean} true if loop running, false if not
 */
Tox.prototype.isStarted = function() {
  return !!this._interval;
};

/**
 * Checks if listening on a tcp port.
 * @return {Boolean} true if tcp, false if not
 */
Tox.prototype.isTcp = function() {
  try {
    this.getTcpPortSync();
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Checks if listening on a udp port.
 * @return {Boolean} true if udp, false if not
 */
Tox.prototype.isUdp = function() {
  try {
    this.getUdpPortSync();
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Start an interateSync loop using setInterval.
 * @param {Number} [wait] - Milliseconds to wait between iterateSync calls
 * @todo Maybe do one iterateSync(), then iterationIntervalSync(), and use that
 *       value as 'wait'?
 */
Tox.prototype.start = function(wait) {
  if(!this.isStarted()) {
    if(isNaN(wait) || wait <= 0) wait = 40; // Default milliseconds to wait
    this._interval = setInterval(Tox.prototype.iterateSync.bind(this), wait);
  }
};

/**
 * Stop the iterateSync loop if there is one running.
 */
Tox.prototype.stop = function() {
  if(this._interval) {
    clearInterval(this._interval);
    this._interval = undefined;
  }
};


//////////////////////////
//> Private helper methods
//////////////////////////


/**
 * Check if this Tox instance has a handle associated with it.
 * @priv
 * @param {Tox~errorCallback} callback - Callback to pass Error object to if no handle
 * @return {Boolean} true if has handle (no error), false if no handle (error)
 */
Tox.prototype._checkHandle = function(callback) {
  if(!this.hasHandle()) {
    var err = new Error('No toxcore handle');
    err.code = 'NO_HANDLE';
    if(callback) {
      callback(err);
    }

    return false;
  } else {
    return true;
  }
};

/**
 * Check to make sure this Tox instance has a handle associated
 * with it. If not, will throw an exception. Meant to be used
 * in sync functions.
 * @priv
 * @throws Error if no handle
 */
Tox.prototype._checkHandleSync = function() {
  if(!this.hasHandle()) {
    var err = new Error('No toxcore handle');
    err.code = 'NO_HANDLE';
    throw err;
  }
};

/**
 * Create a _ToxOptions from opts passed to Tox. This uses
 * Tox#newOptionsSync(), so it expects the ToxOptions struct
 * to be freed by the caller sometime later using
 * Tox#freeOptionsSync().
 * @priv
 * @param {Object} opts
 * @return {ToxOptions} Options
 */
Tox.prototype._createToxOptions = function(opts) {
  var toxopts = this.newOptionsSync(),
      ipv6 = opts['ipv6'],
      udp = opts['udp'],
      startPort = opts['startPort'],
      endPort = opts['endPort'];

  // Default proxy values
  toxopts.proxy_address = ref.NULL;
  toxopts.proxy_type = consts.TOX_PROXY_TYPE_NONE;
  toxopts.proxy_port = 0;

  // If ipv6 not set, use default of false
  ipv6 = (ipv6 !== undefined ? !!ipv6 : false);

  // If udp not set, use default of true
  udp = (udp !== undefined ? !!udp : true);

  toxopts.ipv6_enabled = (ipv6 ? 1 : 0);
  toxopts.udp_enabled = (udp ? 1 : 0);

  if(_.isNumber(startPort)) {
    toxopts.start_port = startPort;
  }

  if(_.isNumber(endPort)) {
    toxopts.end_port = endPort;
  }

  this._setProxyToToxOptions(opts, toxopts);

  return toxopts;
};

/**
 * Fix arguments passed to bootstrap functions.
 * @priv
 */
Tox.prototype._fixBootstrapArgs = function(address, port, publicKey) {
  address = new Buffer(address + '\0');

  if(_.isString(publicKey)) {
    publicKey = (new Buffer(publicKey)).fromHex();
  }

  return [address, port, publicKey];
};

/**
 * Initialize with tox_new.
 * @priv
 * @param {ToxOptions} [options]
 * @todo options, error handling, loading state
 */
Tox.prototype._initNew = function(options) {
  var size = size_t(0),
      eptr = ref.alloc(_ToxErrorType);

  if(options) {
    options = options.ref();
  } else { // If no options passed, use null pointer
    options = ref.NULL;
  }

  this._handle = this.getLibrary().tox_new(options, ref.NULL, size, eptr);

  this._checkToxNewError(eptr.deref());
};

/**
 * Set the proxy part of ToxOptions from opts.
 * @priv
 * @param {Object} opts
 * @param {ToxOptions} options
 * @todo Update for char* proxy_host, instead of char[256] proxy_host
 */
Tox.prototype._setProxyToToxOptions = function(opts, options) {
  var proxy = opts['proxy'];

  if(_.isString(proxy)) {
    proxy = util.parseProxy(proxy);
    // Todo: Debug/error log if couldn't parse proxy string?
  }

  if(_.isObject(proxy)) {
    if(_.isString(proxy.type)) {
      if(/^http$/i.test(proxy.type)) options.proxy_type = consts.TOX_PROXY_TYPE_HTTP;
      else if(/^socks5?$/i.test(proxy.type)) options.proxy_type = consts.TOX_PROXY_TYPE_SOCKS5;
    }

    if(options.proxy_type !== consts.TOX_PROXY_TYPE_NONE) {
      // Set address, max string length 255
      // @todo Enforce 255 max length
      if(_.isString(proxy.address)) {
        // Store in 'this' so it isn't GC-d?
        this._proxyAddress = new Buffer(proxy.address + '\0');
        options.proxy_address = this._proxyAddress;
      }

      // Set port
      if(_.isNumber(proxy.port)) {
        options.proxy_port = proxy.port;
      }
    }
  }
};


/////////////////////////
//> Private error methods
/////////////////////////


/**
 * Check the error value that may have been set by tox_new, and throw
 * the corresponding error (if any).
 * @priv
 * @param {Number} val - Error value to check
 * @todo Finish
 */
Tox.prototype._checkToxNewError = function(val) {
  if(val !== consts.TOX_ERR_NEW_OK) {
    throw (new Error('tox_new error: ' + val));
  }
};

/**
 * Get an Error from a TOX_ERR_BOOTSTRAP value. If none,
 * will return undefined.
 * @priv
 * @param {Number} val - TOX_ERR_BOOTSTRAP value
 * @return {Error} Error, if any
 */
Tox.prototype._getToxBootstrapError = function(val) {
  if(val !== consts.TOX_ERR_BOOTSTRAP_OK) {
    return (new Error('tox_bootstrap: ' + val));
  }
};

/**
 * Get an Error from a TOX_ERR_FRIEND_CUSTOM_PACKET value.
 * If none, will return undefined.
 * @priv
 * @param {Number} val - TOX_ERR_FRIEND_CUSTOM_PACKET value
 * @return {Error} Error, if any
 */
Tox.prototype._getToxFriendCustomPacketError = function(val) {
  if(val !== consts.TOX_ERR_FRIEND_CUSTOM_PACKET_OK) {
    return (new Error('TOX_ERR_FRIEND_CUSTOM_PACKET: ' + val));
  }
};

/**
 * Get an Error from a TOX_ERR_GET_PORT value. If none,
 * will return undefined.
 * @priv
 * @param {Number} val - TOX_ERR_GET_PORT value
 * @return {Error} Error, if any
 */
Tox.prototype._getToxGetPortError = function(val) {
  if(val !== consts.TOX_ERR_GET_PORT_OK) {
    return (new Error('TOX_ERR_GET_PORT: ' + val));
  }
};

/**
 * Get an error for when a function returns unsuccessful, but
 * its error value indicates success.
 * @priv
 * @return {Error} Error
 */
Tox.prototype._getToxNotSuccessfulError = function() {
  return new Error('api function returned unsuccessful, but error value indicates success');
};


///////////////////
//> JSDoc callbacks
///////////////////


/**
 * Callback that returns some error, if any.
 * @callback Tox~errorCallback
 * @param {Error} Error, if any
 */

/**
 * Callback that returns some some number.
 * @callback Tox~numberCallback
 * @param {Error} Error, if any
 * @param {Number} Value
 */

module.exports = Tox;
