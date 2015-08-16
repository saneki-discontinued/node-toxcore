/*
 * This file is part of node-toxcore.
 *
 * node-toxcore is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * node-toxcore is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with node-toxcore. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/**
 * @file tox.js - Implementation for the new api
 * @todo Have all buffer.toString() specify 'utf8'?
 * @todo Use max size for all getters?
 * @todo Solve potential TOCTOU/race issues when using async functions that get
 *       the size of some data, allocate a Buffer of that size and call a tox.h
 *       function to set the data to that Buffer.
 */

var buffertools = require('buffertools');
var events = require('events');
var fs = require('fs');
var ref = require('ref');
var RefArray = require('ref-array');
var ffi = require('ffi');
var path = require('path');
var _ = require('underscore');
var _util = require('util');

buffertools.extend();

var consts = require(path.join(__dirname, 'consts'));
var errors = require(path.join(__dirname, 'errors'));
var toxEvents = require(path.join(__dirname, 'events'));
var ToxOld = require(path.join(__dirname, 'tox_old'));
var ToxOptions = require(path.join(__dirname, 'toxoptions'));

// Util functions
var util = require(path.join(__dirname, 'util'));
var size_t = util.size_t;
var fromHex = util.fromHex;
var getDateFromUInt64 = util.getDateFromUInt64;

// Tox types
var ToxPtr = ref.refType(ref.types.void);
var ToxOptionsPtr = ref.refType(ToxOptions);

// Common types
var UInt8Ptr = ref.refType('uint8');
var Int8Ptr = ref.refType('int8');
var UInt32Ptr = ref.refType('uint32');
var UserData = 'pointer';

// Tox enums and error types
var CEnum = 'int32';
var TOX_CONNECTION = CEnum;
var TOX_FILE_CONTROL = CEnum;
var TOX_FILE_KIND = CEnum;
var TOX_MESSAGE_TYPE = CEnum;
var TOX_USER_STATUS = CEnum;
var TOX_ERR_BOOTSTRAP = CEnum;
var TOX_ERR_FILE_CONTROL = CEnum;
var TOX_ERR_FILE_GET = CEnum;
var TOX_ERR_FILE_SEEK = CEnum;
var TOX_ERR_FILE_SEND = CEnum;
var TOX_ERR_FILE_SEND_CHUNK = CEnum;
var TOX_ERR_FRIEND_ADD = CEnum;
var TOX_ERR_FRIEND_BY_PUBLIC_KEY = CEnum;
var TOX_ERR_FRIEND_CUSTOM_PACKET = CEnum;
var TOX_ERR_FRIEND_DELETE = CEnum;
var TOX_ERR_FRIEND_GET_LAST_ONLINE = CEnum;
var TOX_ERR_FRIEND_GET_PUBLIC_KEY = CEnum;
var TOX_ERR_FRIEND_QUERY = CEnum;
var TOX_ERR_FRIEND_SEND_MESSAGE = CEnum;
var TOX_ERR_GET_PORT = CEnum;
var TOX_ERR_NEW = CEnum;
var TOX_ERR_OPTIONS_NEW = CEnum;
var TOX_ERR_SET_INFO = CEnum;
var TOX_ERR_SET_TYPING = CEnum;

// Buffer sizes for callbacks
var KeyBuffer = RefArray('uint8', consts.TOX_KEY_SIZE);
var KeyBufferPtr = ref.refType(KeyBuffer);
var RequestMessageBuffer = RefArray('uint8', consts.TOX_MAX_FRIEND_REQUEST_LENGTH);
var RequestMessageBufferPtr = ref.refType(RequestMessageBuffer);
var MessageBuffer = RefArray('uint8', consts.TOX_MAX_MESSAGE_LENGTH);
var MessageBufferPtr = ref.refType(MessageBuffer);
var NameBuffer = RefArray('uint8', consts.TOX_MAX_NAME_LENGTH);
var NameBufferPtr = ref.refType(NameBuffer);
var StatusMessageBuffer = RefArray('uint8', consts.TOX_MAX_STATUS_MESSAGE_LENGTH);
var StatusMessageBufferPtr = ref.refType(StatusMessageBuffer);
var FilenameBuffer = RefArray('uint8', consts.TOX_MAX_FILENAME_LENGTH);
var FilenameBufferPtr = ref.refType(FilenameBuffer);
// Use ref.reinterpret() to re-size Buffer at some address
// https://tootallnate.github.io/ref/#exports-reinterpret
var UnknownSizeBuffer = RefArray('uint8', 1);
var UnknownSizeBufferPtr = ref.refType(UnknownSizeBuffer);

// Tox callback types
var SelfConnectionStatusCallback = ffi.Function('void', [ ToxPtr, TOX_CONNECTION, UserData ]);
var FriendNameCallback = ffi.Function('void', [ ToxPtr, 'uint32', NameBufferPtr, 'size_t', UserData ]);
var FriendStatusMessageCallback = ffi.Function('void', [ ToxPtr, 'uint32', StatusMessageBufferPtr, 'size_t', UserData ]);
var FriendStatusCallback = ffi.Function('void', [ ToxPtr, 'uint32', TOX_USER_STATUS, UserData ]);
var FriendConnectionStatusCallback = ffi.Function('void', [ ToxPtr, 'uint32', TOX_CONNECTION, UserData ]);
var FriendTypingCallback = ffi.Function('void', [ ToxPtr, 'uint32', 'bool', UserData ]);
var FriendReadReceiptCallback = ffi.Function('void', [ ToxPtr, 'uint32', 'uint32', UserData ]);
var FriendRequestCallback = ffi.Function('void', [ ToxPtr, KeyBufferPtr, RequestMessageBufferPtr, 'size_t', UserData ]);
var FriendMessageCallback = ffi.Function('void', [ ToxPtr, 'uint32', TOX_MESSAGE_TYPE, MessageBufferPtr, 'size_t', UserData ]);
var FileRecvControlCallback = ffi.Function('void', [ ToxPtr, 'uint32', 'uint32', TOX_FILE_CONTROL, UserData ]);
var FileChunkRequestCallback = ffi.Function('void', [ ToxPtr, 'uint32', 'uint32', 'uint64', 'size_t', UserData ]);
var FileRecvCallback = ffi.Function('void', [ ToxPtr, 'uint32', 'uint32', 'uint32', 'uint64', FilenameBufferPtr, 'size_t', UserData ]);
var FileRecvChunkCallback = ffi.Function('void', [ ToxPtr, 'uint32', 'uint32', 'uint64', UnknownSizeBufferPtr, 'size_t', UserData ]);
var FriendLosslessPacketCallback = ffi.Function('void', [ ToxPtr, 'uint32', UInt8Ptr, 'size_t', UserData ]);

/**
 * Creates a Tox instance.
 * @class
 * @param {Object} [opts] Options
 */
var Tox = function(opts) {
  if(!opts) opts = {};
  var libpath = opts['path'];

  this._emitter = new events.EventEmitter();
  this._library = this.createLibrary(libpath);
  this._options = this._createToxOptions(opts);
  this._initNew(this._options);
  this._initCallbacks();

  // Create a child ToxOld if specified for old groupchat functionality
  if(opts.old === true) {
    this._toxold = new ToxOld({ path: libpath, tox: this });
  }
};

/**
 * Return a string representation of the Tox instance using util.inspect.
 * @return {String} string representation
 */
Tox.prototype.inspect = function() {
  var obj = {};
  Object.keys(this).forEach(function(k) {
    obj[k] = this[k];
    // Hacky fix for StringSlice assert error:
    // void node::Buffer::StringSlice(const v8::FunctionCallbackInfo<v8::Value>&) [with node::encoding encoding = (node::encoding)5u]: Assertion `obj_data != __null' failed.
    if(k === '_options') {
      obj[k] = '[ToxOptions]';
    }
  }, this);
  return _util.inspect(obj);
};

/**
 * Asynchronous-sorta Tox instance creation. Currently is only 'async' if
 * given 'data' as a filepath (string).
 * @param {Object} [opts] Options
 * @param {Tox~toxCallback} [callback]
 * @todo Implement with async tox_new?
 */
Tox.load = function(opts, callback) {
  // Handle Tox.load(callback)
  if(arguments.length === 1 && _.isFunction(opts)) {
    callback = opts;
    opts = {};
  }

  var data = opts['data'];
  if(_.isString(data)) {
    fs.readFile(data, function(err, data) {
      if(!err) {
        opts['data'] = data; // Overwrite data (path) with data (Buffer)
        var tox = new Tox(opts);
        if(callback) {
          callback(undefined, tox);
        }
      } else if(callback) {
        callback(err);
      }
    });
  } else {
    var tox = new Tox(opts);
    if(callback) {
      callback(undefined, tox);
    }
  }
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
    'tox_add_tcp_relay':   [ 'bool', [ ToxPtr, Int8Ptr, 'uint16', UInt8Ptr, ref.refType(TOX_ERR_BOOTSTRAP) ] ],
    'tox_bootstrap':       [ 'bool', [ ToxPtr, Int8Ptr, 'uint16', UInt8Ptr, ref.refType(TOX_ERR_BOOTSTRAP) ] ],
    'tox_callback_file_chunk_request': [ 'void', [ ToxPtr, FileChunkRequestCallback, UserData ] ],
    'tox_callback_file_recv':       [ 'void', [ ToxPtr, FileRecvCallback, UserData ] ],
    'tox_callback_file_recv_chunk': [ 'void', [ ToxPtr, FileRecvChunkCallback, UserData ] ],
    'tox_callback_file_recv_control': [ 'void', [ ToxPtr, FileRecvControlCallback, UserData ] ],
    'tox_callback_friend_connection_status': [ 'void', [ ToxPtr, FriendConnectionStatusCallback, UserData ] ],
    'tox_callback_friend_message': [ 'void', [ ToxPtr, FriendMessageCallback, UserData ] ],
    'tox_callback_friend_name': [ 'void', [ ToxPtr, FriendNameCallback, UserData ] ],
    'tox_callback_friend_read_receipt': [ 'void', [ ToxPtr, FriendReadReceiptCallback, UserData ] ],
    'tox_callback_friend_request': [ 'void', [ ToxPtr, FriendRequestCallback, UserData ] ],
    'tox_callback_friend_status': [ 'void', [ ToxPtr, FriendStatusCallback, UserData ] ],
    'tox_callback_friend_status_message': [ 'void', [ ToxPtr, FriendStatusMessageCallback, UserData ] ],
    'tox_callback_friend_typing': [ 'void', [ ToxPtr, FriendTypingCallback, UserData ] ],
    'tox_callback_self_connection_status': [ 'void', [ ToxPtr, SelfConnectionStatusCallback, UserData ] ],
    'tox_callback_friend_lossless_packet':[ 'void', [ToxPtr, FriendLosslessPacketCallback, UserData ] ],
    'tox_file_control':    [ 'bool',   [ ToxPtr, 'uint32', 'uint32', TOX_FILE_CONTROL, ref.refType(TOX_ERR_FILE_CONTROL) ] ],
    'tox_file_get_file_id':[ 'bool',   [ ToxPtr, 'uint32', 'uint32', UInt8Ptr, ref.refType(TOX_ERR_FILE_GET) ] ],
    'tox_file_seek':       [ 'bool',   [ ToxPtr, 'uint32', 'uint32', 'uint64', ref.refType(TOX_ERR_FILE_SEEK) ] ],
    'tox_file_send':       [ 'uint32', [ ToxPtr, 'uint32', 'uint32', 'uint64', UInt8Ptr, UInt8Ptr, 'size_t', ref.refType(TOX_ERR_FILE_SEND) ] ],
    'tox_file_send_chunk': [ 'bool',   [ ToxPtr, 'uint32', 'uint32', 'uint64', UInt8Ptr, 'size_t', ref.refType(TOX_ERR_FILE_SEND_CHUNK) ] ],
    'tox_friend_add':      [ 'uint32', [ ToxPtr, UInt8Ptr, UInt8Ptr, 'size_t', ref.refType(TOX_ERR_FRIEND_ADD) ] ],
    'tox_friend_add_norequest': [ 'uint32', [ ToxPtr, UInt8Ptr, ref.refType(TOX_ERR_FRIEND_ADD) ] ],
    'tox_friend_by_public_key': [ 'uint32', [ ToxPtr, UInt8Ptr, ref.refType(TOX_ERR_FRIEND_BY_PUBLIC_KEY) ] ],
    'tox_friend_delete':   [ 'bool', [ ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_DELETE) ] ],
    'tox_friend_exists':   [ 'bool', [ ToxPtr, 'uint32' ] ],
    'tox_friend_get_connection_status':     [ TOX_CONNECTION, [ ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_last_online': [ 'uint64', [ ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_GET_LAST_ONLINE) ] ],
    'tox_friend_get_name':      [ 'bool',   [ ToxPtr, 'uint32', UInt8Ptr, ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_name_size': [ 'size_t', [ ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_public_key': [ 'uint32', [ ToxPtr, 'uint32', UInt8Ptr, ref.refType(TOX_ERR_FRIEND_GET_PUBLIC_KEY) ] ],
    'tox_friend_get_status':    [ TOX_USER_STATUS, [ ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_status_message':      [ 'bool',   [ ToxPtr, 'uint32', UInt8Ptr, ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_status_message_size': [ 'size_t', [ ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_send_lossless_packet': [ 'bool', [ ToxPtr, 'uint32', UInt8Ptr, 'size_t', ref.refType(TOX_ERR_FRIEND_CUSTOM_PACKET) ] ],
    'tox_friend_send_lossy_packet':    [ 'bool', [ ToxPtr, 'uint32', UInt8Ptr, 'size_t', ref.refType(TOX_ERR_FRIEND_CUSTOM_PACKET) ] ],
    'tox_friend_send_message': [ 'uint32', [ ToxPtr, 'uint32', TOX_MESSAGE_TYPE, UInt8Ptr, 'size_t', ref.refType(TOX_ERR_FRIEND_SEND_MESSAGE) ] ],
    'tox_hash': [ 'bool', [ UInt8Ptr, UInt8Ptr, 'size_t' ] ],
    'tox_iteration_interval': [ 'uint32', [ ToxPtr ] ],
    'tox_iterate':         [ 'void' , [ ToxPtr ] ],
    'tox_kill': [ 'void',  [ ToxPtr ] ],
    'tox_new':  [ ToxPtr, [ ToxOptionsPtr, ref.refType(TOX_ERR_NEW) ] ],
    'tox_get_savedata':    [ 'void',  [ ToxPtr, UInt8Ptr ] ],
    'tox_get_savedata_size':  [ 'size_t',  [ ToxPtr ] ],
    'tox_options_default': [ 'void', [ ToxOptionsPtr ] ],
    'tox_options_free':    [ 'void', [ ToxOptionsPtr ] ],
    'tox_options_new':     [ ToxOptionsPtr, [ ref.refType(TOX_ERR_OPTIONS_NEW) ] ],
    'tox_self_get_address':  [ 'void',   [ ToxPtr, UInt8Ptr ] ],
    'tox_self_get_connection_status': [ TOX_CONNECTION, [ ToxPtr ] ],
    'tox_self_get_friend_list':      [ 'void',   [ ToxPtr, UInt32Ptr ] ],
    'tox_self_get_friend_list_size': [ 'size_t', [ ToxPtr ] ],
    'tox_self_get_name':     [ 'void',   [ ToxPtr, UInt8Ptr ] ],
    'tox_self_get_name_size':[ 'size_t', [ ToxPtr ] ],
    'tox_self_get_nospam':   [ 'uint32', [ ToxPtr ] ],
    'tox_self_get_public_key': [ 'void', [ ToxPtr, UInt8Ptr ] ],
    'tox_self_get_secret_key': [ 'void', [ ToxPtr, UInt8Ptr ] ],
    'tox_self_get_status':   [ TOX_USER_STATUS, [ ToxPtr ] ],
    'tox_self_get_status_message':     [ 'void',   [ ToxPtr, UInt8Ptr ] ],
    'tox_self_get_status_message_size':[ 'size_t', [ ToxPtr ] ],
    'tox_self_get_tcp_port': [ 'uint16', [ ToxPtr, ref.refType(TOX_ERR_GET_PORT) ] ],
    'tox_self_get_udp_port': [ 'uint16', [ ToxPtr, ref.refType(TOX_ERR_GET_PORT) ] ],
    'tox_self_set_name':   [ 'bool', [ ToxPtr, UInt8Ptr, 'size_t', ref.refType(TOX_ERR_SET_INFO) ] ],
    'tox_self_set_nospam':   [ 'void',   [ ToxPtr, 'uint32' ] ],
    'tox_self_set_status': [ 'void', [ ToxPtr, TOX_USER_STATUS ] ],
    'tox_self_set_status_message': [ 'bool', [ ToxPtr, UInt8Ptr, 'size_t', ref.refType(TOX_ERR_SET_INFO) ] ],
    'tox_self_set_typing':   [ 'bool',   [ ToxPtr, 'uint32', 'bool', ref.refType(TOX_ERR_SET_TYPING) ] ],
    'tox_version_major': [ 'uint32', [ ] ],
    'tox_version_minor': [ 'uint32', [ ] ],
    'tox_version_patch': [ 'uint32', [ ] ]
  });
};


///////////////////////////////////////
//> Wrapper methods for tox.h functions
///////////////////////////////////////


/**
 * Asynchronous tox_version_major(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.versionMajor = function(callback) {
  this._performVersion({
    api: this.getLibrary().tox_version_major.async,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_version_major(3).
 * @return {Number} major version number
 */
Tox.prototype.versionMajorSync = function(callback) {
  return this._performVersion({
    api: this.getLibrary().tox_version_major
  });
};

/**
 * Asynchronous tox_version_minor(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.versionMinor = function(callback) {
  this._performVersion({
    api: this.getLibrary().tox_version_minor.async,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_version_minor(3).
 * @return {Number} minor version number
 */
Tox.prototype.versionMinorSync = function(callback) {
  return this._performVersion({
    api: this.getLibrary().tox_version_minor
  });
};

/**
 * Asynchronous tox_version_patch(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.versionPatch = function(callback) {
  this._performVersion({
    api: this.getLibrary().tox_version_patch.async,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_version_patch(3).
 * @return {Number} patch version number
 */
Tox.prototype.versionPatchSync = function(callback) {
  return this._performVersion({
    api: this.getLibrary().tox_version_patch
  });
};

/**
 * Asynchronous tox_options_free(3).
 * @param {ToxOptions} opts
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.freeOptions = function(opts, callback) {
  this.getLibrary().tox_options_free.async(opts.ref(), callback);
};

/**
 * Synchronous tox_options_free(3).
 * @param {ToxOptions} opts
 */
Tox.prototype.freeOptionsSync = function(opts) {
  this.getLibrary().tox_options_free(opts.ref());
};

/**
 * Asynchronous tox_options_new(3).
 * @note Expects caller to free
 * @param {Tox~optionsCallback} [callback]
 * @return {ToxOptions} Options
 * @todo Error handling
 */
Tox.prototype.newOptions = function(callback) {
  this.getLibrary().tox_options_new.async(ref.NULL, function(err, options) {
    var opts;
    if(!err) opts = options.deref();
    if(callback) {
      callback(err, opts);
    }
  });
};

/**
 * Synchronous tox_options_new(3).
 * @note Expects caller to free
 * @return {ToxOptions} Options
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
  this._performBootstrap({
    api: this.getLibrary().tox_bootstrap.async.bind(undefined, this.getHandle()),
    args: [address, port, publicKey],
    async: true,
    callback: callback
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
  this._performBootstrap({
    api: this.getLibrary().tox_bootstrap.bind(undefined, this.getHandle()),
    args: [address, port, publicKey],
    async: false
  });
};

/**
 * Asynchronous tox_add_tcp_relay(3).
 * @param {String} address
 * @param {Number} port
 * @param {(Buffer|String)} publicKey
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.addTCPRelay = function(address, port, publicKey, callback) {
  this._performBootstrap({
    api: this.getLibrary().tox_add_tcp_relay.async.bind(undefined, this.getHandle()),
    args: [address, port, publicKey],
    async: true,
    callback: callback
  });
};

/**
 * Synchronous tox_add_tcp_relay(3).
 * @param {String} address
 * @param {Number} port
 * @param {(Buffer|String)} publicKey
 * @throws Error if tox_add_tcp_relay errors or returns false
 */
Tox.prototype.addTCPRelaySync = function(address, port, publicKey) {
  this._performBootstrap({
    api: this.getLibrary().tox_add_tcp_relay.bind(undefined, this.getHandle()),
    args: [address, port, publicKey],
    async: false
  });
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
 * Asynchronous tox_self_get_address(3).
 * @param {Tox~dataCallback} [callback]
 */
Tox.prototype.getAddress = function(callback) {
  this._performGetter({
    api: this.getLibrary().tox_self_get_address.async.bind(undefined, this.getHandle()),
    format: 'raw',
    size: consts.TOX_FRIEND_ADDRESS_SIZE,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_address(3).
 * @return {Buffer} address
 */
Tox.prototype.getAddressSync = function() {
  return this._performGetter({
    api: this.getLibrary().tox_self_get_address.bind(undefined, this.getHandle()),
    format: 'raw',
    size: consts.TOX_FRIEND_ADDRESS_SIZE
  });
};


/**
 * Asynchronous tox_self_get_connection_status(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getConnectionStatus = function(callback) {
  this._performNumberGetter({
    api: this.getLibrary().tox_self_get_connection_status.async.bind(undefined, this.getHandle()),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_connection_status(3).
 * @return {Number} connection status
 */
Tox.prototype.getConnectionStatusSync = function() {
  return this._performNumberGetter({
    api: this.getLibrary().tox_self_get_connection_status.bind(undefined, this.getHandle())
  });
};

/**
 * Asynchronous tox_self_set_nospam(3).
 * @param {Number} nospam
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.setNospam = function(nospam, callback) {
  if(!this._checkHandle(callback)) return;
  this.getLibrary().tox_self_set_nospam.async(this.getHandle(), nospam, function(err) {
    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_self_set_nospam(3).
 * @param {Number} nospam
 */
Tox.prototype.setNospamSync = function(nospam) {
  this._checkHandleSync();
  this.getLibrary().tox_self_set_nospam(this.getHandle(), nospam);
};

/**
 * Asynchronous tox_self_get_nospam(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getNospam = function(callback) {
  if(!this._checkHandle(callback)) return;
  this.getLibrary().tox_self_get_nospam.async(this.getHandle(), function(err, nospam) {
    if(callback) {
      callback(err, nospam);
    }
  });
};

/**
 * Synchronous tox_self_get_nospam(3).
 * @return {Number} nospam
 */
Tox.prototype.getNospamSync = function() {
  this._checkHandleSync();
  return this.getLibrary().tox_self_get_nospam(this.getHandle());
};

/**
 * Asynchronous tox_self_get_public_key(3).
 * @param {Tox~dataCallback} [callback]
 */
Tox.prototype.getPublicKey = function(callback) {
  this._performGetter({
    api: this.getLibrary().tox_self_get_public_key.async.bind(undefined, this.getHandle()),
    format: 'raw',
    size: consts.TOX_PUBLIC_KEY_SIZE,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_public_key(3).
 * @return {Buffer} public key
 */
Tox.prototype.getPublicKeySync = function() {
  return this._performGetter({
    api: this.getLibrary().tox_self_get_public_key.bind(undefined, this.getHandle()),
    format: 'raw',
    size: consts.TOX_PUBLIC_KEY_SIZE
  });
};

/**
 * Asynchronous tox_self_get_secret_key(3).
 * @param {Tox~dataCallback} [callback]
 */
Tox.prototype.getSecretKey = function(callback) {
  this._performGetter({
    api: this.getLibrary().tox_self_get_secret_key.async.bind(undefined, this.getHandle()),
    format: 'raw',
    size: consts.TOX_PUBLIC_KEY_SIZE,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_secret_key(3).
 * @return {Buffer} secret key
 */
Tox.prototype.getSecretKeySync = function() {
  return this._performGetter({
    api: this.getLibrary().tox_self_get_secret_key.bind(undefined, this.getHandle()),
    format: 'raw',
    size: consts.TOX_SECRET_KEY_SIZE
  });
};

/**
 * Asynchronous tox_self_set_name(3).
 * @param {String} name
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.setName = function(name, callback) {
  this._performSetter({
    api: this.getLibrary().tox_self_set_name.async.bind(undefined, this.getHandle()),
    data: name,
    error: errors.setInfo,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_set_name(3).
 * @param {String} name
 */
Tox.prototype.setNameSync = function(name) {
  this._performSetter({
    api: this.getLibrary().tox_self_set_name.bind(undefined, this.getHandle()),
    error: errors.setInfo,
    data: name
  });
};

/**
 * Asynchronous tox_self_get_name_size(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getNameSize = function(callback) {
  this._performSizeGetter({
    api: this.getLibrary().tox_self_get_name_size.async.bind(undefined, this.getHandle()),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_name_size(3).
 * @return {Number} name size
 */
Tox.prototype.getNameSizeSync = function() {
  return this._performSizeGetter({
    api: this.getLibrary().tox_self_get_name_size.bind(undefined, this.getHandle())
  });
};

/**
 * Asynchronous tox_self_get_name(3).
 * @param {Tox~stringCallback} [callback]
 */
Tox.prototype.getName = function(callback) {
  this._performGetter({
    api: this.getLibrary().tox_self_get_name.async.bind(undefined, this.getHandle()),
    format: 'string',
    size: Tox.prototype.getNameSize.bind(this),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_name(3).
 * @return {String} name
 */
Tox.prototype.getNameSync = function() {
  return this._performGetter({
    api: this.getLibrary().tox_self_get_name.bind(undefined, this.getHandle()),
    format: 'string',
    size: Tox.prototype.getNameSizeSync.bind(this)
  });
};

/**
 * Asynchronous tox_self_set_status_message(3).
 * @param {String} status_message
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.setStatusMessage = function(statusMessage, callback) {
  this._performSetter({
    api: this.getLibrary().tox_self_set_status_message.async.bind(undefined, this.getHandle()),
    data: statusMessage,
    error: errors.setInfo,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_set_status_message(3).
 * @param {String} status_message
 */
Tox.prototype.setStatusMessageSync = function(statusMessage) {
  this._performSetter({
    api: this.getLibrary().tox_self_set_status_message.bind(undefined, this.getHandle()),
    error: errors.setInfo,
    data: statusMessage
  });
};

/**
 * Asynchronous tox_self_get_status_message_size(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getStatusMessageSize = function(callback) {
  this._performSizeGetter({
    api: this.getLibrary().tox_self_get_status_message_size.async.bind(undefined, this.getHandle()),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_status_message_size(3).
 * @return {Number} status_message size
 */
Tox.prototype.getStatusMessageSizeSync = function() {
  return this._performSizeGetter({
    api: this.getLibrary().tox_self_get_status_message_size.bind(undefined, this.getHandle())
  });
};

/**
 * Asynchronous tox_self_get_status_message(3).
 * @param {Tox~stringCallback} [callback]
 */
Tox.prototype.getStatusMessage = function(callback) {
  this._performGetter({
    api: this.getLibrary().tox_self_get_status_message.async.bind(undefined, this.getHandle()),
    format: 'string',
    size: Tox.prototype.getStatusMessageSize.bind(this),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_status_message(3).
 * @return {String} status message
 */
Tox.prototype.getStatusMessageSync = function() {
  return this._performGetter({
    api: this.getLibrary().tox_self_get_status_message.bind(undefined, this.getHandle()),
    format: 'string',
    size: Tox.prototype.getStatusMessageSizeSync.bind(this)
  });
};

/**
 * Asynchronous tox_self_set_status(3).
 * @param {Number} status
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.setStatus = function(status, callback) {
  this._performNumberSetter({
    api: this.getLibrary().tox_self_set_status.async.bind(undefined, this.getHandle()),
    value: status,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_set_status(3).
 * @param {Number} status
 */
Tox.prototype.setStatusSync = function(status) {
  this._performNumberSetter({
    api: this.getLibrary().tox_self_set_status.bind(undefined, this.getHandle()),
    value: status
  });
};

/**
 * Asynchronous tox_self_get_status(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getStatus = function(callback) {
  this._performNumberGetter({
    api: this.getLibrary().tox_self_get_status.async.bind(undefined, this.getHandle()),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_status(3).
 * @return {Number} status
 */
Tox.prototype.getStatusSync = function() {
  return this._performNumberGetter({
    api: this.getLibrary().tox_self_get_status.bind(undefined, this.getHandle())
  });
};

/**
 * Asynchronous tox_friend_add(3).
 * @param {(Buffer|String)} address
 * @param {(Buffer|String)} message
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.addFriend = function(address, message, callback) {
  if(!this._checkHandle(callback)) return;

  address = fromHex(address);
  if(_.isString(message)) message = new Buffer(message);

  var eptr = ref.alloc(TOX_ERR_FRIEND_ADD);
  this.getLibrary().tox_friend_add.async(
    this.getHandle(), address, message, size_t(message.length), eptr, function(err, friend) {
    var terr = errors.friendAdd(eptr.deref());
    if(!err && terr) err = terr;
    if(callback) {
      callback(err, friend);
    }
  });
};

/**
 * Synchronous tox_friend_add(3).
 * @param {(Buffer|String)} address
 * @param {(Buffer|String)} message
 * @return {Number} friend number
 */
Tox.prototype.addFriendSync = function(address, message) {
  this._checkHandleSync();

  address = fromHex(address);
  if(_.isString(message)) message = new Buffer(message);

  var eptr = ref.alloc(TOX_ERR_FRIEND_ADD),
      friend = this.getLibrary().tox_friend_add(
        this.getHandle(), address, message, size_t(message.length), eptr),
      err = errors.friendAdd(eptr.deref());
  if(err) throw err;
  return friend;
};

/**
 * Asynchronous tox_friend_add_norequest(3).
 * @param {(Buffer|String)} publicKey
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.addFriendNoRequest = function(publicKey, callback) {
  if(!this._checkHandle(callback)) return;
  publicKey = fromHex(publicKey);
  var eptr = ref.alloc(TOX_ERR_FRIEND_ADD);
  this.getLibrary().tox_friend_add_norequest.async(
    this.getHandle(), publicKey, eptr, function(err, friend) {
    var terr = errors.friendAdd(eptr.deref());
    if(!err && terr) err = terr;
    if(callback) {
      callback(err, friend);
    }
  });
};

/**
 * Synchronous tox_friend_add_norequest(3).
 * @param {(Buffer|String)} publicKey
 * @return {Number} friend number
 */
Tox.prototype.addFriendNoRequestSync = function(publicKey) {
  this._checkHandleSync();
  publicKey = fromHex(publicKey);
  var eptr = ref.alloc(TOX_ERR_FRIEND_ADD),
      friend = this.getLibrary().tox_friend_add_norequest(this.getHandle(), publicKey, eptr),
      err = errors.friendAdd(eptr.deref());
  if(err) throw err;
  return friend;
};

/**
 * Asynchronous tox_friend_delete(3).
 * @param {Number} friend
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.deleteFriend = function(friend, callback) {
  if(!this._checkHandle(callback)) return;
  var eptr = ref.alloc(TOX_ERR_FRIEND_DELETE);
  this.getLibrary().tox_friend_delete.async(
    this.getHandle(), friend, eptr, function(err, success) {
    var terr = errors.friendDelete(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_friend_delete(3).
 * @param {Number} friend
 */
Tox.prototype.deleteFriendSync = function(friend) {
  this._checkHandle();
  var eptr = ref.alloc(TOX_ERR_FRIEND_DELETE),
      success = this.getLibrary().tox_friend_delete(this.getHandle(), friend, eptr);
  var err = errors.friendDelete(eptr.deref());
  if(err) throw err;
  if(!success) throw errors.unsuccessful();
};

/**
 * Asynchronous tox_friend_by_public_key(3).
 * @param {(Buffer|String)} publicKey
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getFriendByPublicKey = function(publicKey, callback) {
  if(!this._checkHandle(callback)) return;
  publicKey = fromHex(publicKey);
  var eptr = ref.alloc(TOX_ERR_FRIEND_BY_PUBLIC_KEY);
  this.getLibrary().tox_friend_by_public_key.async(
    this.getHandle(), publicKey, eptr, function(err, friend) {
    var terr = errors.friendByPublicKey(eptr.deref());
    if(!err && terr) err = terr;
    if(callback) {
      callback(err, friend);
    }
  });
};

/**
 * Synchronous tox_friend_by_public_key(3).
 * @param {(Buffer|String)} publicKey
 * @return {Number} friend number
 */
Tox.prototype.getFriendByPublicKeySync = function(publicKey) {
  this._checkHandle();
  publicKey = fromHex(publicKey);
  var eptr = ref.alloc(TOX_ERR_FRIEND_BY_PUBLIC_KEY),
      friend = this.getLibrary().tox_friend_by_public_key(this.getHandle(), publicKey, eptr);
  var err = errors.friendByPublicKey(eptr.deref());
  if(err) throw err;
  return friend;
};

/**
 * Asynchronous tox_friend_get_public_key(3).
 * @param {Number} friend
 * @param {Tox~dataCallback} [callback]
 */
Tox.prototype.getFriendPublicKey = function(friend, callback) {
  if(!this._checkHandle(callback)) return;
  var eptr = ref.alloc(TOX_ERR_FRIEND_GET_PUBLIC_KEY),
      buffer = new Buffer(consts.TOX_PUBLIC_KEY_SIZE);
  this.getLibrary().tox_friend_get_public_key.async(
    this.getHandle(), friend, buffer, eptr, function(err, friend) {
    var terr = errors.friendGetPublicKey(eptr.deref());
    if(!err && terr) err = terr;
    if(callback) {
      callback(err, buffer);
    }
  });
};

/**
 * Synchronous tox_friend_get_public_key(3).
 * @param {Number} friend
 * @return {Buffer} public key
 */
Tox.prototype.getFriendPublicKeySync = function(friend) {
  this._checkHandle();
  var eptr = ref.alloc(TOX_ERR_FRIEND_GET_PUBLIC_KEY),
      buffer = new Buffer(consts.TOX_PUBLIC_KEY_SIZE),
      success = this.getLibrary().tox_friend_get_public_key(this.getHandle(), friend, buffer, eptr);
  var err = errors.friendGetPublicKey(eptr.deref());
  if(err) throw err;
  if(!success) throw errors.unsuccessful();
  return buffer;
};

/**
 * Asynchronous tox_friend_exists(3).
 * @param {Number} friend
 * @param {Tox~booleanCallback} [callback]
 */
Tox.prototype.hasFriend = function(friend, callback) {
  if(!this._checkHandle(callback)) return;
  this.getLibrary().tox_friend_exists.async(this.getHandle(), friend, function(err, exists) {
    if(callback) {
      callback(err, exists);
    }
  });
};

/**
 * Synchronous tox_friend_exists(3).
 * @param {Number} friend
 * @return {Boolean} true if has friend, false if not
 */
Tox.prototype.hasFriendSync = function(friend) {
  this._checkHandleSync();
  return this.getLibrary().tox_friend_exists(this.getHandle(), friend);
};

/**
 * Asynchronous tox_friend_get_last_online(3).
 * @param {Number} friend
 * @param {Tox~dateCallback} [callback]
 * @note This deals with a tox.h function that returns an uint64, which
 *       may lead to inaccuracy, as Javascript numbers are essentially
 *       doubles and "considered accurate up to 15 digits"
 *       www.w3schools.com/js/js_numbers.asp
 */
Tox.prototype.getFriendLastOnline = function(friend, callback) {
  if(!this._checkHandle(callback)) return;
  var eptr = ref.alloc(TOX_ERR_FRIEND_GET_LAST_ONLINE);
  this.getLibrary().tox_friend_get_last_online.async(
    this.getHandle(), friend, eptr, function(err, timeval) {
    var terr = errors.friendGetLastOnline(eptr.deref());
    if(!err && terr) err = terr;

    var date;
    if(!err) date = getDateFromUInt64(timeval);

    if(callback) {
      callback(err, date);
    }
  });
};

/**
 * Synchronous tox_friend_get_last_online(3).
 * @param {Number} friend
 * @return {Date} last online date, may be backed by NaN
 * @note See note for Tox#getFriendLastOnline()
 */
Tox.prototype.getFriendLastOnlineSync = function(friend) {
  this._checkHandle();
  var eptr = ref.alloc(TOX_ERR_FRIEND_GET_LAST_ONLINE),
      timeval = this.getLibrary().tox_friend_get_last_online(this.getHandle(), friend, eptr);
  var err = errors.friendGetLastOnline(eptr.deref());
  if(err) throw err;
  return getDateFromUInt64(timeval);
};

/**
 * Asynchronous tox_self_get_friend_list_size(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getFriendListSize = function(callback) {
  this._performSizeGetter({
    api: this.getLibrary().tox_self_get_friend_list_size.async.bind(undefined, this.getHandle()),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_friend_list_size(3).
 * @return {Number} friend count
 */
Tox.prototype.getFriendListSizeSync = function() {
  return this._performSizeGetter({
    api: this.getLibrary().tox_self_get_friend_list_size.bind(undefined, this.getHandle())
  });
};

/**
 * Asynchronous tox_self_get_friend_list(3).
 * @param {Tox~numberArrayCallback} [callback]
 * @note Between getting the size and calling tox_self_get_friend_list,
 *       we may have another friend leading to an overflow.
 */
Tox.prototype.getFriendList = function(callback) {
  if(!this._checkHandle(callback)) return;
  var _this = this;
  this.getFriendListSize(function(err, size) {
    if(!err) {
      var arr = (new RefArray('uint32'))(size);
      _this.getLibrary().tox_self_get_friend_list.async(
        _this.getHandle(), arr.buffer, function(err) {

        // RefArray -> Javascript Array
        // @todo Make this refArrayToArray()?
        var nums = [];
        if(!err) {
          for(var i = 0; i < arr.length; i++)
            nums.push(arr[i]);
        }

        if(callback) {
          callback(err, nums);
        }
      });
    } else if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_self_get_friend_list(3).
 * @return {Number[]} array of friend numbers
 * @note See overflow note for Tox#getFriendList()
 */
Tox.prototype.getFriendListSync = function() {
  this._checkHandleSync();
  var size = this.getFriendListSizeSync(),
      arr = (new RefArray('uint32'))(size);
  this.getLibrary().tox_self_get_friend_list(this.getHandle(), arr.buffer);

  // RefArray -> Javascript Array
  var nums = [];
  for(var i = 0; i < arr.length; i++)
    nums.push(arr[i]);

  return nums;
};

/**
 * Asynchronous tox_friend_get_name_size(3).
 * @param {Number} friend
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getFriendNameSize = function(friend, callback) {
  this._performFriendNumberGetter({
    api: this.getLibrary().tox_friend_get_name_size.async.bind(undefined, this.getHandle()),
    friend: friend,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_friend_get_name_size(3).
 * @param {Number} friend
 * @return {Number} name size
 */
Tox.prototype.getFriendNameSizeSync = function(friend) {
  return this._performFriendNumberGetter({
    api: this.getLibrary().tox_friend_get_name_size.bind(undefined, this.getHandle()),
    friend: friend
  });
};

/**
 * Asynchronous tox_friend_get_name(3).
 * @param {Number} friend
 * @param {Tox~stringCallback} [callback]
 */
Tox.prototype.getFriendName = function(friend, callback) {
  this._performFriendGetter({
    api: this.getLibrary().tox_friend_get_name.async.bind(undefined, this.getHandle()),
    format: 'string',
    friend: friend,
    size: consts.TOX_MAX_NAME_LENGTH,
    async: true, callback: callback
  });

};

/**
 * Synchronous tox_friend_get_name(3).
 * @param {Number} friend
 * @return {String} friend name
 */
Tox.prototype.getFriendNameSync = function(friend) {
  return this._performFriendGetter({
    api: this.getLibrary().tox_friend_get_name.bind(undefined, this.getHandle()),
    format: 'string',
    friend: friend,
    size: consts.TOX_MAX_NAME_LENGTH
  });
};

/**
 * Asynchronous tox_friend_get_status_message_size(3).
 * @param {Number} friend
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getFriendStatusMessageSize = function(friend, callback) {
  this._performFriendNumberGetter({
    api: this.getLibrary().tox_friend_get_status_message_size.async.bind(undefined, this.getHandle()),
    friend: friend,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_friend_get_status_message_size(3).
 * @param {Number} friend
 * @return {Number} status message size
 */
Tox.prototype.getFriendStatusMessageSizeSync = function(friend) {
  return this._performFriendNumberGetter({
    api: this.getLibrary().tox_friend_get_status_message_size.bind(undefined, this.getHandle()),
    friend: friend
  });
};

/**
 * Asynchronous tox_friend_get_status_message(3).
 * @param {Number} friend
 * @param {Tox~stringCallback} [callback]
 */
Tox.prototype.getFriendStatusMessage = function(friend, callback) {
  this._performFriendGetter({
    api: this.getLibrary().tox_friend_get_status_message.async.bind(undefined, this.getHandle()),
    format: 'string',
    friend: friend,
    size: consts.TOX_MAX_STATUS_MESSAGE_LENGTH,
    async: true, callback: callback
  });

};

/**
 * Synchronous tox_friend_get_status_message(3).
 * @param {Number} friend
 * @return {String} friend status message
 */
Tox.prototype.getFriendStatusMessageSync = function(friend) {
  return this._performFriendGetter({
    api: this.getLibrary().tox_friend_get_status_message.bind(undefined, this.getHandle()),
    format: 'string',
    friend: friend,
    size: consts.TOX_MAX_STATUS_MESSAGE_LENGTH
  });
};

/**
 * Asynchronous tox_friend_get_status(3).
 * @param {Number} friend
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getFriendStatus = function(friend, callback) {
  this._performFriendNumberGetter({
    api: this.getLibrary().tox_friend_get_status.async.bind(undefined, this.getHandle()),
    friend: friend,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_friend_get_status(3).
 * @param {Number} friend
 * @return {Number} friend status
 */
Tox.prototype.getFriendStatusSync = function(friend) {
  return this._performFriendNumberGetter({
    api: this.getLibrary().tox_friend_get_status.bind(undefined, this.getHandle()),
    friend: friend
  });
};

/**
 * Asynchronous tox_friend_get_connection_status(3).
 * @param {Number} friend
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getFriendConnectionStatus = function(friend, callback) {
  this._performFriendNumberGetter({
    api: this.getLibrary().tox_friend_get_connection_status.async.bind(undefined, this.getHandle()),
    friend: friend,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_friend_get_connection_status(3).
 * @param {Number} friend
 * @return {Number} friend status
 */
Tox.prototype.getFriendConnectionStatusSync = function(friend) {
  return this._performFriendNumberGetter({
    api: this.getLibrary().tox_friend_get_connection_status.bind(undefined, this.getHandle()),
    friend: friend
  });
};

/**
 * Asynchronous tox_self_get_udp_port(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getUdpPort = function(callback) {
  this._performGetPort({
    api: this.getLibrary().tox_self_get_udp_port.async.bind(undefined, this.getHandle()),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_udp_port(3).
 * @returns {Number} Port
 * @throws Error if TOX_ERR_GET_PORT set.
 */
Tox.prototype.getUdpPortSync = function() {
  return this._performGetPort({
    api: this.getLibrary().tox_self_get_udp_port.bind(undefined, this.getHandle())
  });
};

/**
 * Asynchronous tox_self_get_tcp_port(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getTcpPort = function(callback) {
  this._performGetPort({
    api: this.getLibrary().tox_self_get_tcp_port.async.bind(undefined, this.getHandle()),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_self_get_tcp_port(3).
 * @returns {Number} Port
 * @throws Error if TOX_ERR_GET_PORT set.
 */
Tox.prototype.getTcpPortSync = function() {
  return this._performGetPort({
    api: this.getLibrary().tox_self_get_tcp_port.bind(undefined, this.getHandle())
  });
};

/**
 * Asynchronous tox_self_set_typing(3).
 * @param {Number} friend
 * @param {Boolean} typing
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.setTyping = function(friend, typing, callback) {
  if(!this._checkHandle(callback)) return;
  var eptr = ref.alloc(TOX_ERR_SET_TYPING);
  this.getLibrary().tox_self_set_typing.async(
    this.getHandle(), friend, typing, eptr, function(err, success) {
    var terr = errors.setTyping(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_self_set_typing(3).
 * @param {Number} friend
 * @param {Boolean} typing
 */
Tox.prototype.setTypingSync = function(friend, typing) {
  this._checkHandleSync();
  var eptr = ref.alloc(TOX_ERR_SET_TYPING),
      success = this.getLibrary().tox_self_set_typing(
        this.getHandle(), friend, typing, eptr);

  var err = errors.setTyping(eptr.deref());
  if(err) throw err;
  if(!success) throw errors.unsuccessful();
};

/**
 * Asynchronous tox_friend_send_message(3).
 * @param {Number} friend
 * @param {(Buffer|String)} message
 * @param {(Boolean|Number|String)} [type] - If boolean, assumed isAction
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.sendFriendMessage = function(friend, message, type, callback) {
  if(!this._checkHandle(callback)) return;

  // If #sendFriendMessage(friend, message, callback), use default type
  if(arguments.length === 3 && _.isFunction(type)) {
    callback = type;
    type = undefined;
  }

  var args = this._fixSendMessageArgs(friend, message, type),
      friend = args[0], message = args[1], type = args[2],
      eptr = ref.alloc(TOX_ERR_FRIEND_SEND_MESSAGE);

  this.getLibrary().tox_friend_send_message.async(
    this.getHandle(), friend, type, message, message.length, eptr, function(err, mid) {
    var terr = errors.friendSendMessage(eptr.deref());
    if(!err && terr) err = terr;
    if(callback) {
      callback(err, mid);
    }
  });
};

/**
 * Synchronous tox_friend_send_message(3).
 * @param {Number} friend
 * @param {(Buffer|String)} message
 * @param {(Boolean|Number|String)} [type] - If boolean, assumed isAction
 * @return {Number} message id
 */
Tox.prototype.sendFriendMessageSync = function(friend, message, type) {
  this._checkHandleSync();
  var args = this._fixSendMessageArgs(friend, message, type),
      friend = args[0], message = args[1], type = args[2],
      eptr = ref.alloc(TOX_ERR_FRIEND_SEND_MESSAGE);

  var mid = this.getLibrary().tox_friend_send_message(
    this.getHandle(), friend, type, message, message.length, eptr);

  var err = errors.friendSendMessage(eptr.deref());
  if(err) throw err;
  return mid;
};

/**
 * Asynchronous tox_hash(3).
 * @param {(Buffer|String)} data
 * @param {Tox~dataCallback} [callback]
 */
Tox.prototype.hash = function(data, callback) {
  if(_.isString(data)) data = new Buffer(data);
  var hash = new Buffer(consts.TOX_HASH_LENGTH);
  this.getLibrary().tox_hash.async(hash, data, data.length,
    function(err, success) {
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err, hash);
    }
  });
};

/**
 * Synchronous tox_hash(3).
 * @param {(Buffer|String)} data
 * @return {Buffer} hash
 */
Tox.prototype.hashSync = function(data) {
  if(_.isString(data)) data = new Buffer(data);
  var hash = new Buffer(consts.TOX_HASH_LENGTH),
      success = this.getLibrary().tox_hash(hash, data, data.length);
  if(!success) throw errors.unsuccessful();
  return hash;
};

/**
 * Asynchronous tox_file_control(3).
 * @param {Number} friendnum
 * @param {Number} filenum
 * @param {Number} control
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.controlFile = function(friendnum, filenum, control, callback) {
  if(!this._checkHandle(callback)) return;
  control = this._fixFileControl(control);
  var eptr = ref.alloc(TOX_ERR_FILE_CONTROL);
  this.getLibrary().tox_file_control.async(
    this.getHandle(), friendnum, filenum, control, eptr, function(err, success) {
    var terr = errors.fileControl(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_file_control(3).
 * @param {Number} friendnum
 * @param {Number} filenum
 * @param {Number} control
 */
Tox.prototype.controlFileSync = function(friendnum, filenum, control) {
  this._checkHandleSync();
  control = this._fixFileControl(control);
  var eptr = ref.alloc(TOX_ERR_FILE_CONTROL),
      success = this.getLibrary().tox_file_control(
        this.getHandle(), friendnum, filenum, control, eptr);
  var err = errors.fileControl(eptr.deref());
  if(err) throw err;
  if(!success) throw errors.unsuccessful();
};

/**
 * Asynchronous tox_file_seek(3).
 * @param {Number} friendnum
 * @param {Number} filenum
 * @param {Number} position
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.seekFile = function(friendnum, filenum, position, callback) {
  if(!this._checkHandle(callback)) return;
  var eptr = ref.alloc(TOX_ERR_FILE_SEEK);
  this.getLibrary().tox_file_seek.async(
    this.getHandle(), friendnum, filenum, position, eptr, function(err, success) {
    var terr = errors.fileSeek(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_file_seek(3).
 * @param {Number} friendnum
 * @param {Number} filenum
 * @param {Number} position
 */
Tox.prototype.seekFileSync = function(friendnum, filenum, position) {
  this._checkHandleSync();
  var eptr = ref.alloc(TOX_ERR_FILE_SEEK),
      success = this.getLibrary().tox_file_seek(
        this.getHandle(), friendnum, filenum, position, eptr);
  var err = errors.fileSeek(eptr.deref());
  if(err) throw err;
  if(!success) throw errors.unsuccessful();
};

/**
 * Asynchronous tox_file_get_file_id(3).
 * @param {Number} friendnum
 * @param {Number} filenum
 * @param {Tox~dataCallback} [callback]
 */
Tox.prototype.getFileId = function(friendnum, filenum, callback) {
  if(!this._checkHandle(callback)) return;
  var eptr = ref.alloc(TOX_ERR_FILE_GET),
      fileid = new Buffer(consts.TOX_FILE_ID_LENGTH);
  this.getLibrary().tox_file_get_file_id.async(
    this.getHandle(), friendnum, filenum, fileid, eptr, function(err, success) {
    var terr = errors.fileGet(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err, fileid);
    }
  });
};

/**
 * Synchronous tox_file_get_file_id(3).
 * @param {Number} friendnum
 * @param {Number} filenum
 * @return {Buffer} file id
 */
Tox.prototype.getFileIdSync = function(friendnum, filenum) {
  this._checkHandleSync();
  var eptr = ref.alloc(TOX_ERR_FILE_GET),
      fileid = new Buffer(consts.TOX_FILE_ID_LENGTH),
      success = this.getLibrary().tox_file_get_file_id(
        this.getHandle(), friendnum, filenum, fileid, eptr);
  var err = errors.fileGet(eptr.deref());
  if(err) throw err;
  if(!success) throw errors.unsuccessful();
  return fileid;
};

/**
 * Asynchronous tox_file_send(3).
 * @param {Number} friendnum
 * @param {Number} kind
 * @param {(Buffer|String)} filename
 * @param {Number} size
 * @param {Buffer} [fileid]
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.sendFile = function(friendnum, kind, filename, size, fileid, callback) {
  if(!this._checkHandle(callback)) return;
  if(arguments.length === 5 && _.isFunction(fileid)) {
    callback = fileid;
    fileid = undefined;
  }
  if(!fileid) fileid = ref.NULL;
  if(_.isString(filename)) {
    filename = new Buffer(filename);
  }
  var eptr = ref.alloc(TOX_ERR_FILE_SEND);
  this.getLibrary().tox_file_send.async(
    this.getHandle(), friendnum, kind, size, fileid, filename, filename.length, eptr, function(err, filenum) {
    var terr = errors.fileSend(eptr.deref());
    if(!err && terr) err = terr;
    if(callback) {
      callback(err, filenum);
    }
  });
};

/**
 * Synchronous tox_file_send(3).
 * @param {Number} friendnum
 * @param {Number} kind
 * @param {(Buffer|String)} filename
 * @param {Number} size
 * @param {Buffer} [fileid]
 * @return {Number} file number
 */
Tox.prototype.sendFileSync = function(friendnum, kind, filename, size, fileid) {
  this._checkHandleSync();
  if(!fileid) fileid = ref.NULL;
  if(_.isString(filename)) {
    filename = new Buffer(filename);
  }
  var eptr = ref.alloc(TOX_ERR_FILE_SEND);
      filenum = this.getLibrary().tox_file_send(
        this.getHandle(), friendnum, kind, size, fileid, filename, filename.length, eptr);
  var err = errors.fileSend(eptr.deref());
  if(err) throw err;
  return filenum;
};

/**
 * Asynchronous tox_file_send_chunk(3).
 * @param {Number} friendnum
 * @param {Number} filenum
 * @param {Number} position
 * @param {Buffer} data
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.sendFileChunk = function(friendnum, filenum, position, data, callback) {
  if(!this._checkHandle(callback)) return;
  var eptr = ref.alloc(TOX_ERR_FILE_SEND_CHUNK);
  this.getLibrary().tox_file_send_chunk.async(
    this.getHandle(), friendnum, filenum, position, data, data.length, eptr, function(err, success) {
    var terr = errors.fileSendChunk(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_file_send_chunk(3).
 * @param {Number} friendnum
 * @param {Number} filenum
 * @param {Number} position
 * @param {Buffer} data
 */
Tox.prototype.sendFileChunkSync = function(friendnum, filenum, position, data) {
  this._checkHandleSync();
  var eptr = ref.alloc(TOX_ERR_FILE_SEND_CHUNK);
      success = this.getLibrary().tox_file_send_chunk(
        this.getHandle(), friendnum, filenum, position, data, data.length, eptr);
  var err = errors.fileSendChunk(eptr.deref());
  if(err) throw err;
  if(!success) throw errors.unsuccessful();
};

/**
 * Asynchronous tox_friend_send_lossless_packet(3).
 * @param {Number} friendnum
 * @param {Buffer} data
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.sendLosslessPacket = function(friendnum, data, callback) {
  data = this._fixSendLosslessPacket(data);
  this._performSendPacket({
    api: this.getLibrary().tox_friend_send_lossless_packet.async.bind(undefined, this.getHandle()),
    data: data,
    friend: friendnum,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_friend_send_lossless_packet(3).
 * @param {Number} friendnum
 * @param {Buffer} data
 * @throws Error if TOX_ERR_FRIEND_CUSTOM_PACKET set
 * @throws Error if tox_friend_send_lossless_packet returns false
 */
Tox.prototype.sendLosslessPacketSync = function(friendnum, data) {
  data = this._fixSendLosslessPacket(data);
  this._performSendPacket({
    api: this.getLibrary().tox_friend_send_lossless_packet.bind(undefined, this.getHandle()),
    data: data,
    friend: friendnum
  });
};

/**
 * Asynchronous tox_friend_send_lossy_packet(3).
 * @untested
 * @param {Number} friendnum
 * @param {Buffer} data
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.sendLossyPacket = function(friendnum, data, callback) {
  this._performSendPacket({
    api: this.getLibrary().tox_friend_send_lossy_packet.async.bind(undefined, this.getHandle()),
    data: data,
    friend: friendnum,
    async: true, callback: callback
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
  this._performSendPacket({
    api: this.getLibrary().tox_friend_send_lossy_packet.bind(undefined, this.getHandle()),
    data: data,
    friend: friendnum
  });
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

/**
 * Asynchronous tox_get_savedata_size(3).
 * @param {Tox~numberCallback} [callback]
 */
Tox.prototype.getSavedataSize = function(callback) {
  this._performSizeGetter({
    api: this.getLibrary().tox_get_savedata_size.async.bind(undefined, this.getHandle()),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_get_savedata_size(3).
 * @return {Number} savedata size
 */
Tox.prototype.getSavedataSizeSync = function(callback) {
  return this._performSizeGetter({
    api: this.getLibrary().tox_get_savedata_size.bind(undefined, this.getHandle())
  });
};

/**
 * Asynchronous tox_get_savedata(3).
 * @param {Tox~dataCallback} [callback]
 */
Tox.prototype.getSavedata = function(callback) {
  this._performGetter({
    api: this.getLibrary().tox_get_savedata.async.bind(undefined, this.getHandle()),
    format: 'raw',
    size: Tox.prototype.getSavedataSize.bind(this),
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_get_savedata(3).
 * @return {Buffer} savedata
 */
Tox.prototype.getSavedataSync = function() {
  return this._performGetter({
    api: this.getLibrary().tox_get_savedata.bind(undefined, this.getHandle()),
    format: 'raw',
    size: Tox.prototype.getSavedataSizeSync.bind(this)
  });
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
 * Get the event emitter.
 * @return {EventEmitter} emitter
 */
Tox.prototype.getEmitter = function() {
  return this._emitter;
};

/**
 * Get the ToxOptions as an object.
 * @return {Object} object
 */
Tox.prototype.getOptions = function() {
  var options = this._options;

  var proxyAddress = undefined;
  if(ref.address(options.proxy_address) !== 0) {
    proxyAddress = ref.reinterpretUntilZeros(options.proxy_address, ref.types.char.size).toString();
  }

  return {
    ipv6_enabled: options.ipv6_enabled,
    udp_enabled: options.udp_enabled,
    proxy_type: options.proxy_type,
    proxy_address: proxyAddress,
    proxy_port: options.proxy_port,
    start_port: options.start_port,
    end_port: options.end_port,
    savedata_type: options.savedata_type,
    savedata_data: ref.address(options.savedata_data),
    savedata_length: options.savedata_length
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
 * Wrapper method for _emitter.removeListener.
 */
Tox.prototype.off = function() {
  this._emitter.removeListener.apply(this._emitter, arguments);
};

/**
 * Get the ToxOld object for old groupchat functions/events, if any.
 * @return {ToxOld} ToxOld object, or undefined if none
 */
Tox.prototype.old = function() {
  return this._toxold;
};

/**
 * Wrapper method for _emitter.on.
 */
Tox.prototype.on = function() {
  this._emitter.on.apply(this._emitter, arguments);
};

/**
 * Asynchronously save state to a tox file.
 * @param {String} filepath
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.saveToFile = function(filepath, callback) {
  this.getSavedata(function(err, buffer) {
    if(!err) {
      fs.writeFile(filepath, buffer, { mode: 0600 }, callback);
    } else if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronously save state to a tox file.
 * @param {String} filepath
 */
Tox.prototype.saveToFileSync = function(filepath) {
  fs.writeFileSync(filepath, this.getSavedataSync(), { mode: 0600 });
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

/**
 * Asynchronously get the address as a hex string.
 */
Tox.prototype.getAddressHex = function(callback) {
  util.hexify(this.getAddress.bind(this), callback);
};

/**
 * Synchronously get the address as a hex string.
 * @return {String} Address hex string
 */
Tox.prototype.getAddressHexSync = function() {
  return util.hexifySync(this.getAddressSync.bind(this));
};

/**
 * Asynchronously get the public key of a friend as a hex string.
 */
Tox.prototype.getFriendPublicKeyHex = function(friend, callback) {
  util.hexify(this.getFriendPublicKey.bind(this, friend), callback);
};

/**
 * Synchronously get the public key of a friend as a hex string.
 * @return {String} Friend public key hex string
 */
Tox.prototype.getFriendPublicKeyHexSync = function(friend) {
  return util.hexifySync(this.getFriendPublicKeySync.bind(this, friend));
};

/**
 * Asynchronously get the public key as a hex string.
 */
Tox.prototype.getPublicKeyHex = function(callback) {
  util.hexify(this.getPublicKey.bind(this), callback);
};

/**
 * Synchronously get the public key as a hex string.
 * @return {String} Public key hex string
 */
Tox.prototype.getPublicKeyHexSync = function() {
  return util.hexifySync(this.getPublicKeySync.bind(this));
};

/**
 * Asynchronously get the secret key as a hex string.
 */
Tox.prototype.getSecretKeyHex = function(callback) {
  util.hexify(this.getSecretKey.bind(this), callback);
};

/**
 * Synchronously get the secret key as a hex string.
 * @return {String} Secret key hex string
 */
Tox.prototype.getSecretKeyHexSync = function() {
  return util.hexifySync(this.getSecretKeySync.bind(this));
};


//////////////////////////
//> Private helper methods
//////////////////////////


/**
 * Check if this Tox instance has a handle associated with it.
 * @private
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
 * @private
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
 * Create a ToxOptions from opts passed to Tox. This uses
 * Tox#newOptionsSync(), so it expects the ToxOptions struct
 * to be freed by the caller sometime later using
 * Tox#freeOptionsSync().
 * @private
 * @param {Object} opts
 * @return {ToxOptions} Options
 */
Tox.prototype._createToxOptions = function(opts) {
  var toxopts = this.newOptionsSync(),
      ipv6 = opts['ipv6'],
      udp = opts['udp'],
      startPort = opts['startPort'],
      endPort = opts['endPort'],
      data = opts['data'];

  // If 'data' is a string, assume filepath to read data from
  if(_.isString(data)) {
    data = fs.readFileSync(data);
  }

  if(data) {
    toxopts.savedata_type = consts.TOX_SAVEDATA_TYPE_TOX_SAVE;
    toxopts.savedata_length = size_t(data.length);
  } else {
    data = ref.NULL;
    toxopts.savedata_type = consts.TOX_SAVEDATA_TYPE_NONE;
    toxopts.savedata_length = 0;
  }

  toxopts.savedata_data = data;

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
 * Wrapper method for _emitter.emit.
 * @private
 */
Tox.prototype._emit = function() {
  this._emitter.emit.apply(this._emitter, arguments);
};

/**
 * Fix arguments passed to bootstrap functions.
 * @private
 */
Tox.prototype._fixBootstrapArgs = function(address, port, publicKey) {
  address = new Buffer(address + '\0');

  if(_.isString(publicKey)) {
    publicKey = (new Buffer(publicKey)).fromHex();
  }

  return [address, port, publicKey];
};

/**
 * Fix arguments passed to send-message functions.
 * @private
 */
Tox.prototype._fixSendMessageArgs = function(to, message, type) {
  if(_.isString(message)) {
    message = (new Buffer(message));
  }

  if(_.isBoolean(type)) {
    type = (type ? consts.TOX_MESSAGE_TYPE_ACTION
                 : consts.TOX_MESSAGE_TYPE_NORMAL);
  } else if(_.isString(type)) {
    type = (/^action$/i.test(type) ? consts.TOX_MESSAGE_TYPE_ACTION
                                   : consts.TOX_MESSAGE_TYPE_NORMAL);
  } else if(!_.isNumber(type)) {
    type = consts.TOX_MESSAGE_TYPE_NORMAL;
  }

  return [to, message, type];
};

/**
 * Fix a control file value. If a string, convert to its numeric value
 * ('resume', 'pause', 'cancel').
 * @private
 * @param {(Number|String)} control
 * @return {Number} control value
 */
Tox.prototype._fixFileControl = function(control) {
  if(_.isString(control)) {
    if(/^resume$/i.test(control)) {
      return consts.TOX_FILE_CONTROL_RESUME;
    } else if(/^pause$/i.test(control)) {
      return consts.TOX_FILE_CONTROL_PAUSE;
    } else if(/^cancel$/i.test(control)) {
      return consts.TOX_FILE_CONTROL_CANCEL;
    }
  }
  return control;
};

/**
 * Fix a send lossless packet value. Adds magic byte(160) to the first byte of data
 * @private
 * @param {Buffer} data
 * @return {Buffer} new data
 */
Tox.prototype._fixSendLosslessPacket = function(data){
  //160: magic byte
  return buffertools.concat(new Buffer([160]), data);
  /*var buff = new Buffer(data.length + 1);
  buff[0] = 160;//magic byte
  for(var i = 0; i < data.length; ++i){
    buff[i + 1] = data[i];
  }
  /*var buff = ref.reinterpret(data, (data.length + 1), 1);
  buff[0] = 160;//magic byte*/
  //return buff;
};

/**
 * Initialize with tox_new.
 * @private
 * @param {ToxOptions} [options]
 * @param {(Buffer|String)} [data]
 * @todo Take one param (opts map)
 */
Tox.prototype._initNew = function(options, data) {
  var eptr = ref.alloc(TOX_ERR_NEW);

  if(options) {
    options = options.ref();
  } else { // If no options passed, use null pointer
    options = ref.NULL;
  }

  this._handle = this.getLibrary().tox_new(options, eptr);

  errors.checkToxNewError(eptr.deref());
};

/**
 * Set the proxy part of ToxOptions from opts.
 * @private
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

/**
 * Store an ffi.Callback. This is to prevent an annoying ffi garbage collection bug.
 * @private
 * @param {Object} key - Key
 * @param {ffi.Callback} callback - Callback
 */
Tox.prototype._storeFFICallback = function(key, callback) {
  if(!this._ffiCallbacks)
    this._ffiCallbacks = {};

  if(this._ffiCallbacks[key] === undefined)
    this._ffiCallbacks[key] = [ callback ];
  else this._ffiCallbacks[key].push(callback);
};

/**
 * Helper for node-ffi's Function to Callback.
 * @private
 * @param {ffi.Function} ffiFunc - Function definition
 * @param {Function} callback - Callback function
 * @return {ffi.Callback} ffi callback
 */
Tox.prototype._toFFICallback = function(ffiFunc, callback) {
  return ffi.Callback(ffiFunc.retType, ffiFunc.argTypes, callback);
};


/////////////////////
//> Perform functions
/////////////////////


/**
 * Used in: Tox#bootstrap(), Tox#bootstrapSync(), Tox#addTCPRelay(), Tox#addTCPRelaySync().
 * @private
 */
Tox.prototype._performBootstrap = function(opts) {
  var api = opts['api'],
      args = opts['args'],
      async = opts['async'], callback = opts['callback'],
      address = args[0], port = args[1], publicKey = args[2];

  // Fix address and public key
  address = new Buffer(address + '\0');
  if(_.isString(publicKey)) {
    publicKey = (new Buffer(publicKey)).fromHex();
  }

  var eptr = ref.alloc(TOX_ERR_BOOTSTRAP);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(address, port, publicKey, eptr, function(err, success) {
      var terr = errors.bootstrap(eptr.deref());
      if(!err && terr) err = terr;
      if(!err && !success) err = errors.unsuccessful();
      if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    var success = api(address, port, publicKey, eptr);
    var err = errors.bootstrap(eptr.deref());
    if(err) throw err;
    if(!success) throw errors.unsuccessful();
  }
};

/**
 * Helper wrapper function for friend getters that take a Buffer of
 * some size and set data to it.
 * @todo Custom error type/function, ex. TOX_ERR_FRIEND_GET_PUBLIC_KEY
 * @private
 */
Tox.prototype._performFriendGetter = function(opts) {
  var api = opts['api'],
      friend = opts['friend'],
      raw = (opts['format'] === 'raw'),
      _size = opts['size'],
      async = opts['async'], callback = opts['callback'];

  if(_.isNumber(_size)) {
    var size;
    if(async) size = (function(cb) { cb(undefined, _size); });
    else size = (function() { return _size; });
  } else size = _size; // Assumes size is a Function

  var eptr = ref.alloc(TOX_ERR_FRIEND_QUERY);

  if(async) {
    if(!this._checkHandle(callback)) return;
    size(function(err, size) {
      if(!err) {
        var buffer = new Buffer(size);
        buffer.fill(0);
        api(friend, buffer, eptr, function(err, success) {
          var terr = errors.friendQuery(eptr.deref());
          if(!err && terr) err = terr;
          if(!err && !success) err = errors.unsuccessful();
          if(!err && !raw) buffer = buffer.toString('utf8');
          if(callback) {
            callback(err, buffer);
          }
        });
      } else if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    size = size();
    var buffer = new Buffer(size);
    buffer.fill(0);
    var success = api(friend, buffer, eptr);
    var err = errors.friendQuery(eptr.deref());
    if(err) throw err;
    if(!success) throw errors.unsuccessful();
    if(!raw) buffer = buffer.toString('utf8');
    return buffer;
  }
};

/**
 * Helper wrapper function for friend api functions that return
 * a Number.
 * @private
 */
Tox.prototype._performFriendNumberGetter = function(opts) {
  var api = opts['api'],
      friend = opts['friend'],
      async = opts['async'], callback = opts['callback'];

  var eptr = ref.alloc(TOX_ERR_FRIEND_QUERY);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(friend, eptr, function(err, size) {
      var terr = errors.friendQuery(eptr.deref());
      if(!err && terr) err = terr;
      if(!err) size = Number(size);
      if(callback) {
        callback(err, size);
      }
    });
  } else {
    this._checkHandleSync();
    var size = api(friend, eptr);
    var err = errors.friendQuery(eptr.deref());
    if(err) throw err;
    return Number(size);
  }
};

/**
 * Helper wrapper function for api functions that take a buffer
 * (char*, uint8_t*) of some size and set data to it.
 * @todo Write tests to make sure there's no possibility of overflow, as
 *       things may change between the size function running (creating
 *       a Buffer of that size) and trying to move data to that Buffer.
 * @private
 */
Tox.prototype._performGetter = function(opts) {
  var api = opts['api'],
      raw = (opts['format'] === 'raw'),
      _size = opts['size'],
      async = opts['async'], callback = opts['callback'];

  if(_.isNumber(_size)) {
    var size;
    if(async) size = (function(cb) { cb(undefined, _size); });
    else size = (function() { return _size; });
  } else size = _size; // Assumes size is a Function

  if(async) {
    if(!this._checkHandle(callback)) return;
    size(function(err, size) {
      if(!err) {
        var buffer = new Buffer(size);
        api(buffer, function(err) {
          if(!err && !raw) buffer = buffer.toString('utf8');
          if(callback) {
            callback(err, buffer);
          }
        });
      } else if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    size = size();
    var buffer = new Buffer(size);
    api(buffer);
    if(!raw) buffer = buffer.toString('utf8');
    return buffer;
  }
};

/**
 * Helper wrapper function for api functions that return a Number.
 * @private
 */
Tox.prototype._performNumberGetter = function(opts) {
  var api = opts['api'],
      async = opts['async'], callback = opts['callback'];

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(function(err, size) {
      if(!err) size = Number(size);
      if(callback) {
        callback(err, size);
      }
    });
  } else {
    this._checkHandleSync();
    var size = api();
    return Number(size);
  }
};

/**
 * @private
 */
Tox.prototype._performNumberSetter = function(opts) {
  var api = opts['api'],
      value = opts['value'],
      async = opts['async'], callback = opts['callback'];

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(value, function(err) {
      if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    api(value);
  }
};

/**
 * Helper wrapper function for api functions that get a size_t.
 * @private
 */
Tox.prototype._performSizeGetter = function(opts) {
  return this._performNumberGetter(opts);
};

/**
 * Helper wrapper function for api functions that take a buffer
 * (char*, uint8_t*) or a string of some size and use it to set data.
 * @private
 */
Tox.prototype._performSetter = function(opts) {
  var api = opts['api'],
      data = opts['data'],
      errorCheck = opts['error'],
      async = opts['async'], callback = opts['callback'];

  if(_.isString(data)) {
    data = new Buffer(data);
  }

  var eptr = ref.alloc(CEnum); // @todo: Make this more specific?

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(data, size_t(data.length), eptr, function(err, success) {
      var terr = errorCheck(eptr.deref());
      if(!err && terr) err = terr;
      if(!err && !success) err = errors.unsuccessful();
      if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    var success = api(data, size_t(data.length), eptr),
        err = errorCheck(eptr.deref());
    if(err) throw err;
    if(!success) throw errors.unsuccessful();
  }
};

/**
 * Helper wrapper function for api functions that take a friend and a
 * Buffer to send a packet.
 * @private
 */
Tox.prototype._performSendPacket = function(opts) {
  var api = opts['api'],
      data = opts['data'],
      friendnum = opts['friend'],
      async = opts['async'], callback = opts['callback'];

  var eptr = ref.alloc(TOX_ERR_FRIEND_CUSTOM_PACKET);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(friendnum, data, size_t(data.length), eptr, function(err, res) {
      var terr = errors.friendCustomPacket(eptr.deref());
      if(!err && terr) err = terr;
      if(!err && !res) err = errors.unsuccessful();
      if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    var success = api(friendnum, data, size_t(data.length), eptr),
        err = errors.friendCustomPacket(eptr.deref());
    if(err) throw err;
    if(!success) throw errors.unsuccessful();
  }
};

/**
 * Helper wrapper function for api functions that get a port.
 * @private
 */
Tox.prototype._performGetPort = function(opts) {
  var api = opts['api'],
      async = opts['async'], callback = opts['callback'];

  var eptr = ref.alloc(TOX_ERR_GET_PORT);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(eptr, function(err, port) {
      var terr = errors.getPort(eptr.deref());
      if(!err && terr) err = terr;
      if(callback) {
        callback(err, port);
      }
    });
  } else {
    this._checkHandleSync();
    var port = api(eptr);
    var err = errors.getPort(eptr.deref());
    if(err) throw err;
    return port;
  }
};

/**
 * Helper wrapper function for version api functions.
 * @private
 */
Tox.prototype._performVersion = function(opts) {
  var api = opts['api'],
      async = opts['async'], callback = opts['callback'];
  if(async) {
    api(function(err, version) {
      if(callback) {
        callback(err, version);
      }
    });
  } else {
    return api();
  }
};


///////////////////////
//> Events initializers
///////////////////////


/**
 * Initialize all callbacks.
 * @private
 */
Tox.prototype._initCallbacks = function() {
  this._initSelfConnectionStatusCb();
  this._initFriendNameCb();
  this._initFriendStatusMessageCb();
  this._initFriendStatusCb();
  this._initFriendConnectionStatusCb();
  this._initFriendTypingCb();
  this._initFriendReadReceiptCb();
  this._initFriendRequestCb();
  this._initFriendMessageCb();
  this._initFileRecvControlCb();
  this._initFileChunkRequestCb();
  this._initFileRecvCb();
  this._initFileRecvChunkCb();
  this._initFriendLosslessPacketCb();
};

/**
 * Helper function for initializing tox callbacks.
 * @private
 */
Tox.prototype._initCallback = function(opts) {
  this._checkHandleSync();

  var api = opts['api'],
      cb = opts['cb'], // Callback type
      name = opts['name'],
      wrapper = opts['wrapper'];

  var x = this._toFFICallback(cb, wrapper);
  this._storeFFICallback(name, x); // Store for GC issues
  api(x, ref.NULL);
};

/**
 * Initialize the selfConnectionStatus event callback.
 * @private
 */
Tox.prototype._initSelfConnectionStatusCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_self_connection_status.bind(undefined, this.getHandle()),
    cb: SelfConnectionStatusCallback,
    name: 'SelfConnectionStatus',
    wrapper: function(handle, connection, userdata) {
      _this._emit('selfConnectionStatus', new toxEvents.SelfConnectionStatusEvent(connection));
    }
  });
};

/**
 * Initialize the friendName event callback.
 * @private
 */
Tox.prototype._initFriendNameCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_name.bind(undefined, this.getHandle()),
    cb: FriendNameCallback,
    name: 'FriendName',
    wrapper: function(handle, friend, buffer, size, userdata) {
      var name = buffer.slice(0, size).toString();
      _this._emit('friendName', new toxEvents.FriendNameEvent(friend, name));
    }
  });
};

/**
 * Initialize the friendStatusMessage event callback.
 * @private
 */
Tox.prototype._initFriendStatusMessageCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_status_message.bind(undefined, this.getHandle()),
    cb: FriendStatusMessageCallback,
    name: 'FriendStatusMessage',
    wrapper: function(handle, friend, buffer, size, userdata) {
      var statusMessage = buffer.slice(0, size).toString();
      _this._emit('friendStatusMessage', new toxEvents.FriendStatusMessageEvent(friend, statusMessage));
    }
  });
};

/**
 * Initialize the friendStatus event callback.
 * @private
 */
Tox.prototype._initFriendStatusCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_status.bind(undefined, this.getHandle()),
    cb: FriendStatusCallback,
    name: 'FriendStatus',
    wrapper: function(handle, friend, status, userdata) {
      _this._emit('friendStatus', new toxEvents.FriendStatusEvent(friend, status));
    }
  });
};

/**
 * Initialize the friendConnectionStatus event callback.
 * @private
 */
Tox.prototype._initFriendConnectionStatusCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_connection_status.bind(undefined, this.getHandle()),
    cb: FriendConnectionStatusCallback,
    name: 'FriendConnectionStatus',
    wrapper: function(handle, friend, connection, userdata) {
      _this._emit('friendConnectionStatus', new toxEvents.FriendConnectionStatusEvent(friend, connection));
    }
  });
};

/**
 * Initialize the friendTyping event callback.
 * @private
 */
Tox.prototype._initFriendTypingCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_typing.bind(undefined, this.getHandle()),
    cb: FriendTypingCallback,
    name: 'FriendTypingStatus',
    wrapper: function(handle, friend, typing, userdata) {
      _this._emit('friendTyping', new toxEvents.FriendTypingEvent(friend, typing));
    }
  });
};

/**
 * Initialize the friendReadReceipt event callback.
 * @private
 */
Tox.prototype._initFriendReadReceiptCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_read_receipt.bind(undefined, this.getHandle()),
    cb: FriendReadReceiptCallback,
    name: 'FriendReadReceiptStatus',
    wrapper: function(handle, friend, receipt, userdata) {
      _this._emit('friendReadReceipt', new toxEvents.FriendReadReceiptEvent(friend, receipt));
    }
  });
};

/**
 * Initialize the friendRequest event callback.
 * @private
 */
Tox.prototype._initFriendRequestCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_request.bind(undefined, this.getHandle()),
    cb: FriendRequestCallback,
    name: 'FriendRequestStatus',
    wrapper: function(handle, publicKey, data, size, userdata) {
      publicKey = new Buffer(publicKey); // Copy into persistent Buffer
      var message = data.slice(0, size).toString();
      _this._emit('friendRequest', new toxEvents.FriendRequestEvent(publicKey, message));
    }
  });
};

/**
 * Initialize the friendMessage event callback.
 * @private
 */
Tox.prototype._initFriendMessageCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_message.bind(undefined, this.getHandle()),
    cb: FriendMessageCallback,
    name: 'FriendMessage',
    wrapper: function(handle, friend, type, data, size, userdata) {
      var message = data.slice(0, size).toString();
      _this._emit('friendMessage', new toxEvents.FriendMessageEvent(friend, type, message));
    }
  });
};

/**
 * Initialize the fileRecvControl event callback.
 * @private
 */
Tox.prototype._initFileRecvControlCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_file_recv_control.bind(undefined, this.getHandle()),
    cb: FileRecvControlCallback,
    name: 'FileRecvControlCallback',
    wrapper: function(handle, friend, file, control, userdata) {
      _this._emit('fileRecvControl', new toxEvents.FileRecvControlEvent(friend, file, control));
    }
  });
};

/**
 * Initialize the fileChunkRequest event callback.
 * @private
 */
Tox.prototype._initFileChunkRequestCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_file_chunk_request.bind(undefined, this.getHandle()),
    cb: FileChunkRequestCallback,
    name: 'FileChunkRequestCallback',
    wrapper: function(handle, friend, file, position, length, userdata) {
      _this._emit('fileChunkRequest', new toxEvents.FileChunkRequestEvent(friend, file, position, length));
    }
  });
};

/**
 * Initialize the fileRecv event callback.
 * @private
 */
Tox.prototype._initFileRecvCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_file_recv.bind(undefined, this.getHandle()),
    cb: FileRecvCallback,
    name: 'FileRecvCallback',
    wrapper: function(handle, friend, file, kind, size, filename, length, userdata) {
      // Filename might be NULL, probably if file kind is AVATAR or non-DATA
      if(ref.address(filename) !== 0) {
        filename = (ref.reinterpret(filename, length)).toString('utf8');
      } else {
        filename = undefined;
      }
      _this._emit('fileRecv', new toxEvents.FileRecvEvent(friend, file, kind, size, filename));
    }
  });
};

/**
 * Initialize the fileRecvChunk event callback.
 * @private
 */
Tox.prototype._initFileRecvChunkCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_file_recv_chunk.bind(undefined, this.getHandle()),
    cb: FileRecvChunkCallback,
    name: 'FileRecvChunkCallback',
    wrapper: function(handle, friend, file, position, data, size, userdata) {
      // Apparently data can sometimes be a NULL pointer, set data to undefined if so
      // This should only happen on final chunk?
      if(ref.address(data) !== 0) {
        data = new Buffer(ref.reinterpret(data, size)); // Copy to another Buffer
      } else {
        data = undefined;
      }
      _this._emit('fileRecvChunk', new toxEvents.FileRecvChunkEvent(friend, file, position, data));
    }
  });
};

/**
 * Initialize the friendLosslessPacket event callback.
 * @private
 */
Tox.prototype._initFriendLosslessPacketCb = function(){
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_friend_lossless_packet.bind(undefined, this.getHandle()),
    cb: FriendLosslessPacketCallback,
    name: 'FriendLosslessPacketCallback',
    wrapper: function(handle, friend, data, length, userdata){
      if(ref.address(data) !== 0) {
        //first byte is magic byte(160) so ignore it
        data = new Buffer(ref.reinterpret(data, (length - 1), 1)); // Copy to another Buffer
      } else {
        data = undefined;
      }
      _this._emit('friendLosslessPacket', new toxEvents.FriendLosslessPacketEvent(friend, data));
    }
  });  
}

///////////////////
//> JSDoc callbacks
///////////////////


/**
 * Callback that returns some error, if any.
 * @callback Tox~errorCallback
 * @param {Error} error - error, if any
 */

/**
 * Callback that returns some boolean.
 * @callback Tox~booleanCallback
 * @param {Error} error - error, if any
 * @param {Boolean} value
 */

/**
 * Callback that returns some data in a Buffer.
 * @callback Tox~dataCallback
 * @param {Error} error - error, if any
 * @param {Buffer} data
 */

/**
 * Callback that returns a Date object.
 * @callback Tox~dateCallback
 * @param {Error} error - error, if any
 * @param {Date} date
 */

/**
 * Callback that returns some number.
 * @callback Tox~numberCallback
 * @param {Error} error - error, if any
 * @param {Number} value
 */

/**
 * Callback that returns an array of numbers.
 * @callback Tox~numberArrayCallback
 * @param {Error} error - error, if any
 * @param {Number[]} numbers
 */

/**
 * Callback that returns a ToxOptions object.
 * @callback Tox~optionsCallback
 * @param {Error} error - error if any
 * @param {ToxOptions} options
 */

/**
 * Callback that returns some string.
 * @callback Tox~stringCallback
 * @param {Error} error - error, if any
 * @param {Number} value
 */

/**
 * Callback that returns a Tox object.
 * @callback Tox~toxCallback
 * @param {Error} error - error, if any
 * @param {Tox} tox
 */

module.exports = Tox;
