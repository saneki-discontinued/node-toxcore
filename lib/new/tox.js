/**
 * @file tox.js - Implementation for the new api
 * @todo Have all buffer.toString() specify 'utf8'?
 * @todo Use max size for all getters?
 */

var buffertools = require('buffertools');
var events = require('events');
var fs = require('fs');
var ref = require('ref');
var RefArray = require('ref-array');
var ffi = require('ffi');
var path = require('path');
var _ = require('underscore');

var consts = require(path.join(__dirname, 'consts'));
var errors = require(path.join(__dirname, 'errors'));
var toxEvents = require(path.join(__dirname, 'events'));
var ToxOptions = require(path.join(__dirname, 'toxoptions'));
var util = require(path.join(__dirname, 'util'));

// var size_t = util.size_t;
// Apparently node-ffi accepts strings for types larger than 32-bits...
// Base-10 strings? Trying this for now.
var size_t = function(num) { return num.toString(); };

var fromHex = util.fromHex;

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
var _ToxErrorFriendAddPtr = ref.refType(_ToxErrorType);
var _ToxErrorFriendCustomPacketPtr = ref.refType(_ToxErrorType);
var _ToxErrorGetPortPtr = ref.refType(_ToxErrorType);
var _ToxErrorOptionsNewPtr = ref.refType(_ToxErrorType);
var _ToxErrorSetInfoPtr = ref.refType(_ToxErrorType);

var ToxUserStatus = 'int32';

// Todo: Rename error stuff above
var CEnum = 'int32';
var TOX_CONNECTION = CEnum;
var TOX_MESSAGE_TYPE = CEnum;
var TOX_USER_STATUS = CEnum;
var TOX_ERR_FRIEND_QUERY = CEnum;
var TOX_ERR_FRIEND_SEND_MESSAGE = CEnum;
var TOX_ERR_SET_TYPING = CEnum;
var UserData = 'pointer';

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

var SelfConnectionStatusCallback = ffi.Function('void', [ _ToxPtr, TOX_CONNECTION, UserData ]);
var FriendNameCallback = ffi.Function('void', [ _ToxPtr, 'uint32', NameBufferPtr, 'size_t', UserData ]);
var FriendStatusMessageCallback = ffi.Function('void', [ _ToxPtr, 'uint32', StatusMessageBufferPtr, 'size_t', UserData ]);
var FriendStatusCallback = ffi.Function('void', [ _ToxPtr, 'uint32', TOX_USER_STATUS, UserData ]);
var FriendConnectionStatusCallback = ffi.Function('void', [ _ToxPtr, 'uint32', TOX_CONNECTION, UserData ]);
var FriendTypingCallback = ffi.Function('void', [ _ToxPtr, 'uint32', 'bool', UserData ]);
var FriendReadReceiptCallback = ffi.Function('void', [ _ToxPtr, 'uint32', 'uint32', UserData ]);
var FriendRequestCallback = ffi.Function('void', [ _ToxPtr, KeyBufferPtr, RequestMessageBufferPtr, 'size_t', UserData ]);
var FriendMessageCallback = ffi.Function('void', [ _ToxPtr, 'uint32', TOX_MESSAGE_TYPE, MessageBufferPtr, 'size_t', UserData ]);

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
    'tox_callback_friend_connection_status': [ 'void', [ _ToxPtr, FriendConnectionStatusCallback, UserData ] ],
    'tox_callback_friend_message': [ 'void', [ _ToxPtr, FriendMessageCallback, UserData ] ],
    'tox_callback_friend_name': [ 'void', [ _ToxPtr, FriendNameCallback, UserData ] ],
    'tox_callback_friend_read_receipt': [ 'void', [ _ToxPtr, FriendReadReceiptCallback, UserData ] ],
    'tox_callback_friend_request': [ 'void', [ _ToxPtr, FriendRequestCallback, UserData ] ],
    'tox_callback_friend_status': [ 'void', [ _ToxPtr, FriendStatusCallback, UserData ] ],
    'tox_callback_friend_status_message': [ 'void', [ _ToxPtr, FriendStatusMessageCallback, UserData ] ],
    'tox_callback_friend_typing': [ 'void', [ _ToxPtr, FriendTypingCallback, UserData ] ],
    'tox_callback_self_connection_status': [ 'void', [ _ToxPtr, SelfConnectionStatusCallback, UserData ] ],
    'tox_friend_add':      [ 'uint32', [ _ToxPtr, _UInt8Ptr, _UInt8Ptr, 'size_t', _ToxErrorFriendAddPtr ] ],
    'tox_friend_add_norequest': [ 'uint32', [ _ToxPtr, _UInt8Ptr, _ToxErrorFriendAddPtr ] ],
    'tox_friend_get_connection_status':     [ TOX_CONNECTION, [ _ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_name':      [ 'bool',   [ _ToxPtr, 'uint32', _UInt8Ptr, ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_name_size': [ 'size_t', [ _ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_status':    [ TOX_USER_STATUS, [ _ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_status_message':      [ 'bool',   [ _ToxPtr, 'uint32', _UInt8Ptr, ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_get_status_message_size': [ 'size_t', [ _ToxPtr, 'uint32', ref.refType(TOX_ERR_FRIEND_QUERY) ] ],
    'tox_friend_send_lossless_packet': [ 'bool', [ _ToxPtr, 'uint32', _UInt8Ptr, 'size_t', _ToxErrorFriendCustomPacketPtr ] ],
    'tox_friend_send_lossy_packet':    [ 'bool', [ _ToxPtr, 'uint32', _UInt8Ptr, 'size_t', _ToxErrorFriendCustomPacketPtr ] ],
    'tox_friend_send_message': [ 'uint32', [ _ToxPtr, 'uint32', TOX_MESSAGE_TYPE, _UInt8Ptr, 'size_t', ref.refType(TOX_ERR_FRIEND_SEND_MESSAGE) ] ],
    'tox_iteration_interval': [ 'uint32', [ _ToxPtr ] ],
    'tox_iterate':         [ 'void' , [ _ToxPtr ] ],
    'tox_kill': [ 'void',  [ _ToxPtr ] ],
    'tox_new':  [ _ToxPtr, [ _ToxOptionsPtr, _UInt8Ptr, 'size_t', _ToxErrorNewPtr ] ],
    'tox_get_savedata':    [ 'void',  [ _ToxPtr, _UInt8Ptr ] ],
    'tox_get_savedata_size':  [ 'size_t',  [ _ToxPtr ] ],
    'tox_options_default': [ 'void', [ _ToxOptionsPtr ] ],
    'tox_options_free':    [ 'void', [ _ToxOptionsPtr ] ],
    'tox_options_new':     [ _ToxOptionsPtr, [ _ToxErrorOptionsNewPtr ] ],
    'tox_self_set_typing':   [ 'bool',   [ _ToxPtr, 'uint32', 'bool', ref.refType(TOX_ERR_SET_TYPING) ] ],
    'tox_self_get_address':  [ 'void',   [ _ToxPtr, _UInt8Ptr ] ],
    'tox_self_get_name':     [ 'void',   [ _ToxPtr, _UInt8Ptr ] ],
    'tox_self_get_name_size':[ 'size_t', [ _ToxPtr ] ],
    'tox_self_get_status':   [ ToxUserStatus, [ _ToxPtr ] ],
    'tox_self_get_status_message':     [ 'void',   [ _ToxPtr, _UInt8Ptr ] ],
    'tox_self_get_status_message_size':[ 'size_t', [ _ToxPtr ] ],
    'tox_self_get_tcp_port': [ 'uint16', [ _ToxPtr, _ToxErrorGetPortPtr ] ],
    'tox_self_get_udp_port': [ 'uint16', [ _ToxPtr, _ToxErrorGetPortPtr ] ],
    'tox_self_set_name':   [ 'bool', [ _ToxPtr, _UInt8Ptr, 'size_t', _ToxErrorSetInfoPtr ] ],
    'tox_self_set_status': [ 'void', [ _ToxPtr, ToxUserStatus ] ],
    'tox_self_set_status_message': [ 'bool', [ _ToxPtr, _UInt8Ptr, 'size_t', _ToxErrorSetInfoPtr ] ]
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
 * Asynchronous tox_self_set_name(3).
 * @param {String} name
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.setName = function(name, callback) {
  this._performSetter({
    api: this.getLibrary().tox_self_set_name.async.bind(undefined, this.getHandle()),
    data: name,
    error: errors.getToxSetInfoError,
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
    error: errors.getToxSetInfoError,
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
    error: errors.getToxSetInfoError,
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
    error: errors.getToxSetInfoError,
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

  var eptr = ref.alloc(_ToxErrorType);
  this.getLibrary().tox_friend_add.async(
    this.getHandle(), address, message, size_t(message.length), eptr, function(err, friend) {
    var terr = errors.getToxFriendAddError(eptr.deref());
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

  var eptr = ref.alloc(_ToxErrorType),
      friend = this.getLibrary().tox_friend_add(
        this.getHandle(), address, message, size_t(message.length), eptr),
      err = errors.getToxFriendAddError(eptr.deref());
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
  var eptr = ref.alloc(_ToxErrorType);
  this.getLibrary().tox_friend_add_norequest.async(
    this.getHandle(), publicKey, eptr, function(err, friend) {
    var terr = errors.getToxFriendAddError(eptr.deref());
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
  var eptr = ref.alloc(_ToxErrorType),
      friend = this.getLibrary().tox_friend_add_norequest(this.getHandle(), publicKey, eptr),
      err = errors.getToxFriendAddError(eptr.deref());
  if(err) throw err;
  return friend;
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
    var terr = errors.getToxSetTypingError(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.getToxNotSuccessfulError();
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

  var err = errors.getToxSetTypingError(eptr.deref());
  if(err) throw err;
  if(!success) throw errors.getToxNotSuccessfulError();
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
    var terr = errors.getToxFriendSendMessageError(eptr.deref());
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

  var err = errors.getToxFriendSendMessageError(eptr.deref());
  if(err) throw err;
};

/**
 * Asynchronous tox_friend_send_lossless_packet(3).
 * @untested
 * @param {Number} friendnum
 * @param {Buffer} data
 * @param {Tox~errorCallback} [callback]
 */
Tox.prototype.sendLosslessPacket = function(friendnum, data, callback) {
  this._performSendPacket({
    api: this.getLibrary().tox_friend_send_lossless_packet.async.bind(undefined, this.getHandle()),
    data: data,
    friend: friendnum,
    async: true, callback: callback
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
 * Wrapper method for _emitter.emit.
 * @priv
 */
Tox.prototype._emit = function() {
  this._emitter.emit.apply(this._emitter, arguments);
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
 * Fix arguments passed to send-message functions.
 * @priv
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

  errors.checkToxNewError(eptr.deref());
};

/**
 * Wrapper method for _emitter.removeListener.
 */
Tox.prototype.off = function() {
  this._emitter.removeListener.apply(this._emitter, arguments);
};

/**
 * Wrapper method for _emitter.on.
 */
Tox.prototype.on = function() {
  this._emitter.on.apply(this._emitter, arguments);
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

/**
 * Store an ffi.Callback. This is to prevent an annoying ffi garbage collection bug.
 * @priv
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
 * @priv
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
 * @priv
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

  var eptr = ref.alloc(_ToxErrorType);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(address, port, publicKey, eptr, function(err, success) {
      var terr = errors.getToxBootstrapError(eptr.deref());
      if(!err && terr) err = terr;
      if(!err && !success) err = errors.getToxNotSuccessfulError();
      if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    var success = api(address, port, publicKey, eptr);
    var err = errors.getToxBootstrapError(eptr.deref());
    if(err) throw err;
    if(!success) throw errors.getToxNoSuccessfulError();
  }
};

/**
 * Helper wrapper function for friend getters that take a Buffer of
 * some size and set data to it.
 * @todo Custom error type/function, ex. TOX_ERR_FRIEND_GET_PUBLIC_KEY
 * @priv
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
          var terr = errors.getToxFriendQueryError(eptr.deref());
          if(!err && terr) err = terr;
          if(!err && !success) err = errors.getToxNotSuccessfulError();
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
    var err = errors.getToxFriendQueryError(eptr.deref());
    if(err) throw err;
    if(!success) throw errors.getToxNotSuccessfulError();
    if(!raw) buffer = buffer.toString('utf8');
    return buffer;
  }
};

/**
 * Helper wrapper function for friend api functions that return
 * a Number.
 * @priv
 */
Tox.prototype._performFriendNumberGetter = function(opts) {
  var api = opts['api'],
      friend = opts['friend'],
      async = opts['async'], callback = opts['callback'];

  var eptr = ref.alloc(TOX_ERR_FRIEND_QUERY);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(friend, eptr, function(err, size) {
      var terr = errors.getToxFriendQueryError(eptr.deref());
      if(!err && terr) err = terr;
      if(!err) size = Number(size);
      if(callback) {
        callback(err, size);
      }
    });
  } else {
    this._checkHandleSync();
    var size = api(friend, eptr);
    var err = errors.getToxFriendQueryError(eptr.deref());
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
 * @priv
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
 * @priv
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
 * @priv
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
 * @priv
 */
Tox.prototype._performSizeGetter = function(opts) {
  return this._performNumberGetter(opts);
};

/**
 * Helper wrapper function for api functions that take a buffer
 * (char*, uint8_t*) or a string of some size and use it to set data.
 * @priv
 */
Tox.prototype._performSetter = function(opts) {
  var api = opts['api'],
      data = opts['data'],
      errorCheck = opts['error'],
      async = opts['async'], callback = opts['callback'];

  if(_.isString(data)) {
    data = new Buffer(data);
  }

  var eptr = ref.alloc(_ToxErrorType);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(data, size_t(data.length), eptr, function(err, success) {
      var terr = errorCheck(eptr.deref());
      if(!err && terr) err = terr;
      if(!err && !success) err = errors.getToxNotSuccessfulError();
      if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    var success = api(data, size_t(data.length), eptr),
        err = errorCheck(eptr.deref());
    if(err) throw err;
    if(!success) throw errors.getToxNotSuccessfulError();
  }
};

/**
 * Helper wrapper function for api functions that take a friend and a
 * Buffer to send a packet.
 * @priv
 */
Tox.prototype._performSendPacket = function(opts) {
  var api = opts['api'],
      data = opts['data'],
      friendnum = opts['friend'],
      async = opts['async'], callback = opts['callback'];

  var eptr = ref.alloc(_ToxErrorType);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(friendnum, data, size_t(data.length), eptr, function(err, res) {
      var terr = errors.getToxFriendCustomPacketError(eptr.deref());
      if(!err && terr) err = terr;
      if(!err && !res) err = errors.getToxNotSuccessfulError();
      if(callback) {
        callback(err);
      }
    });
  } else {
    this._checkHandleSync();
    var success = api(friendnum, data, size_t(data.length), eptr),
        err = errors.getToxFriendCustomPacketError(eptr.deref());
    if(err) throw err;
    if(!success) throw errors.getToxNotSuccessfulError();
  }
};

/**
 * Helper wrapper function for api functions that get a port.
 * @priv
 */
Tox.prototype._performGetPort = function(opts) {
  var api = opts['api'],
      async = opts['async'], callback = opts['callback'];

  var eptr = ref.alloc(_ToxErrorType);

  if(async) {
    if(!this._checkHandle(callback)) return;
    api(eptr, function(err, port) {
      var terr = errors.getToxGetPortError(eptr.deref());
      if(!err && terr) err = terr;
      if(callback) {
        callback(err, port);
      }
    });
  } else {
    this._checkHandleSync();
    var port = api(eptr);
    var err = errors.getToxGetPortError(eptr.deref());
    if(err) throw err;
    return port;
  }
};


///////////////////////
//> Events initializers
///////////////////////


/**
 * Initialize all callbacks.
 * @priv
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
};

/**
 * Helper function for initializing tox callbacks.
 * @priv
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
 * @priv
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
 * @priv
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
 * @priv
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
 * @priv
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
 * @priv
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
 * @priv
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
 * @priv
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
 * @priv
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
 * @priv
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


///////////////////
//> JSDoc callbacks
///////////////////


/**
 * Callback that returns some error, if any.
 * @callback Tox~errorCallback
 * @param {Error} Error, if any
 */

/**
 * Callback that returns some data in a Buffer.
 * @callback Tox~errorCallback
 * @param {Error} Error, if any
 * @param {Buffer} Data
 */

/**
 * Callback that returns some number.
 * @callback Tox~numberCallback
 * @param {Error} Error, if any
 * @param {Number} Value
 */

/**
 * Callback that returns some string.
 * @callback Tox~stringCallback
 * @param {Error} Error, if any
 * @param {Number} Value
 */

module.exports = Tox;
