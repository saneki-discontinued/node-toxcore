var buffertools = require('buffertools');
var fs = require('fs');
var ref = require('ref');
var ffi = require('ffi');
var path = require('path');
var _ = require('underscore');
var RefArray = require('ref-array');
var RefStruct = require('ref-struct');

buffertools.extend();

// Tox types
var _Tox = ref.types.void;
var _ToxPtr = ref.refType(_Tox);
var _ToxOptions = RefStruct({
  'ipv6enabled': 'uint8',
  'udp_disabled': 'uint8',
  'proxy_type': 'uint8',
  'proxy_address': RefArray('char', 256), // char[256], null-termd
  'proxy_port': 'uint16',
  'start_port': 'uint16',
  'end_port': 'uint16'
});
var _ToxOptionsPtr = ref.refType(_ToxOptions);

// Common types
var _UInt8Ptr = ref.refType('uint8');
var _UInt16Ptr = ref.refType('uint16');
var _UInt32Ptr = ref.refType('uint32');
var _Int8Ptr = ref.refType('int8');
var _Int16Ptr = ref.refType('int16');
var _Int32Ptr = ref.refType('int32');
var _SizePtr = ref.refType('size_t');

// Tox error types
var _ToxErrorNew = 'uint32';
var _ToxErrorNewPtr = _UInt32Ptr;
var _ToxErrorBootstrapPtr = _UInt32Ptr;
var _ToxOptionsErrorNewPtr = _UInt32Ptr;

/**
 * Creates a Tox instance.
 * @class
 * @param {Object} [opts] Options
 */
var Tox = function(opts) {
  if(!opts) opts = {};
  var libpath = opts['path'];

  this._library = this.createLibrary(libpath);
  this._initNew();
};

/**
 * Initialize with tox_new.
 * @priv
 * @todo options, error handling, loading state
 */
Tox.prototype._initNew = function() {
  var size = ref.alloc('size_t');
  size.fill(0);
  this._handle = this.getLibrary().tox_new(ref.NULL, ref.NULL, size.deref(), ref.NULL);
};

/**
 * Get the handle object.
 * @return {Object}
 */
Tox.prototype.getHandle = function() {
  return this._handle;
};

/**
 * Get the internal Library instance.
 * @return {ffi.Library}
 */
Tox.prototype.getLibrary = function() {
  return this._library;
};

/**
 * Synchronous tox_bootstrap(3).
 * @param {String} address
 * @param {Number} port
 * @param {(Buffer|String)} publicKey
 * @todo Error handling
 */
Tox.prototype.bootstrapSync = function(address, port, publicKey) {
  address = new Buffer(address + '\0');

  if(_.isString(publicKey)) {
    publicKey = (new Buffer(publicKey)).fromHex();
  }

  var success = this.getLibrary().tox_bootstrap(this.getHandle(), address, port, publicKey, ref.NULL);
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
    'tox_iteration_interval': [ 'uint32', [ _ToxPtr ] ],
    'tox_iteration':       [ 'void' , [ _ToxPtr ] ],
    'tox_kill': [ 'void',  [ _ToxPtr ] ],
    'tox_new':  [ _ToxPtr, [ _ToxOptionsPtr, _UInt8Ptr, 'size_t', _ToxErrorNewPtr ] ],
    'tox_save': [ 'void',  [ _ToxPtr, _UInt8Ptr ] ],
    'tox_save_size':       [ 'size_t',  [ _ToxPtr ] ],
    'tox_options_default': [ 'void', [ _ToxOptionsPtr ] ],
    'tox_options_free':    [ 'void', [ _ToxOptionsPtr ] ],
    'tox_options_new':     [ _ToxOptionsPtr, [ _ToxOptionsErrorNewPtr ] ]
  });
};

/**
 * Check whether or not an iterationSync loop is running.
 * @return {Boolean} true if loop running, false if not
 */
Tox.prototype.isStarted = function() {
  return !!this._interval;
};

/**
 * Asynchronous tox_iteration_interval(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.iterationInterval = function(callback) {
  this.getLibrary().tox_iteration_interval.async(this.getHandle(), callback);
};

/**
 * Synchronous tox_iteration_interval(3).
 * @return {Number} milliseconds until the next tox_iteration should occur
 */
Tox.prototype.iterationIntervalSync = function() {
  return this.getLibrary().tox_iteration_interval(this.getHandle());
};

/**
 * Asynchronous tox_iteration(3).
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.iteration = function(callback) {
  this.getLibrary().tox_iteration(this.getHandle(), callback);
};

/**
 * Synchronous tox_iteration(3).
 */
Tox.prototype.iterationSync = function() {
  this.getLibrary().tox_iteration(this.getHandle());
};

/**
 * Asynchronous tox_kill(3).
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.kill = function(callback) {
  this.getLibrary().tox_kill.async(this.getHandle(), callback);
};

/**
 * Synchronous tox_kill(3).
 */
Tox.prototype.killSync = function() {
  this.getLibrary().tox_kill(this.getHandle());
};

/**
 * Start an interationSync loop using setInterval.
 * @param {Number} [wait] - Milliseconds to wait between iterationSync calls
 * @todo Maybe do one iterationSync(), then iterationIntervalSync(), and use that
 *       value as 'wait'?
 */
Tox.prototype.start = function(wait) {
  if(!this.isStarted()) {
    if(isNaN(wait) || wait <= 0) wait = 40; // Default milliseconds to wait
    this._interval = setInterval(Tox.prototype.iterationSync.bind(this), wait);
  }
};

/**
 * Stop the iterationSync loop if there is one running.
 */
Tox.prototype.stop = function() {
  if(this._interval) {
    clearInterval(this._interval);
    this._interval = undefined;
  }
};

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
