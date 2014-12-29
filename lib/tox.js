var buffer = require('buffer');
var buffertools = require('buffertools');
var events = require('events');
var fs = require('fs');
var ref = require('ref');
var ffi = require('ffi');
var path = require('path');
var _ = require('underscore');
var RefStruct = require('ref-struct');
var RefArray = require('ref-array');
var util = require(path.join(__dirname, 'util'));
var toxEvents = require(path.join(__dirname, 'events'));

buffertools.extend();

var ERRMSG_NO_HANDLE = 'Tox handle undefined';

var TOX_KEY_SIZE = 32; // Size of a tox private or public key
var TOX_FRIEND_ADDRESS_SIZE = TOX_KEY_SIZE + 6;
var TOX_MAX_NAME_LENGTH = 128;
var TOX_MAX_STATUS_MESSAGE_LENGTH = 1007;
var TOX_MAX_MESSAGE_LENGTH = 1368;
var TOX_HASH_LENGTH = 32;
var TOX_AVATAR_MAX_DATA_LENGTH = 16384;

var TOX_GROUPCHAT_TYPE_TEXT = 0;
var TOX_GROUPCHAT_TYPE_AV = 1;

// Better way to do this via iteration?
var Consts = {
  TOX_KEY_SIZE: TOX_KEY_SIZE,
  TOX_FRIEND_ADDRESS_SIZE: TOX_FRIEND_ADDRESS_SIZE,
  TOX_MAX_NAME_LENGTH: TOX_MAX_NAME_LENGTH,
  TOX_MAX_STATUS_MESSAGE_LENGTH: TOX_MAX_STATUS_MESSAGE_LENGTH,
  TOX_MAX_MESSAGE_LENGTH: TOX_MAX_MESSAGE_LENGTH,
  TOX_HASH_LENGTH: TOX_HASH_LENGTH,
  TOX_AVATAR_MAX_DATA_LENGTH: TOX_AVATAR_MAX_DATA_LENGTH,
  TOX_GROUPCHAT_TYPE_TEXT: TOX_GROUPCHAT_TYPE_TEXT,
  TOX_GROUPCHAT_TYPE_AV: TOX_GROUPCHAT_TYPE_AV
};

var _Tox = ref.types.void;
var _ToxPtr = ref.refType(_Tox);
var _ToxOptions = RefStruct({
  'ipv6enabled': 'uint8',
  'udp_disabled': 'uint8',
  'proxy_enabled': 'uint8',
  'proxy_address': RefArray('char', 256), // char[256], null-termd
  'proxy_port': 'uint16'
});
var _ToxOptionsPtr = ref.refType(_ToxOptions);
var _UInt8Ptr = ref.refType('uint8');
var _UInt16Ptr = ref.refType('uint16');
var _UInt32Ptr = ref.refType('uint32');
var _Int8Ptr = ref.refType('int8');
var _Int16Ptr = ref.refType('int16');
var _Int32Ptr = ref.refType('int32');

var _KeyBuffer = RefArray('uint8', TOX_KEY_SIZE);
var _KeyBufferPtr = ref.refType(_KeyBuffer);
var _MessageBuffer = RefArray('uint8', TOX_MAX_MESSAGE_LENGTH);
var _MessageBufferPtr = ref.refType(_MessageBuffer);
var _NameBuffer = RefArray('uint8', TOX_MAX_NAME_LENGTH);
var _NameBufferPtr = ref.refType(_NameBuffer);
var _MaxSizeBuffer = RefArray('uint8', 0xFFFF); // Would like to avoid doing this...
var _MaxSizeBufferPtr = ref.refType(_MaxSizeBuffer);
var _HashBuffer = RefArray('uint8', TOX_HASH_LENGTH);
var _HashBufferPtr = ref.refType(_HashBuffer);
var _AvatarDataBuffer = RefArray('uint8', TOX_AVATAR_MAX_DATA_LENGTH);
var _AvatarDataBufferPtr = ref.refType(_AvatarDataBuffer);

var _FriendRequestCallback = ffi.Function('void', [ _ToxPtr, _KeyBufferPtr, _MaxSizeBufferPtr, 'uint16', 'pointer' ]);
var _FriendMessageCallback = ffi.Function('void', [ _ToxPtr, 'int32', _MessageBufferPtr, 'uint16', 'pointer' ]);
var _FriendActionCallback  = ffi.Function('void', [ _ToxPtr, 'int32', _MaxSizeBufferPtr, 'uint16', 'pointer' ]);
var _NameChangeCallback    = _FriendActionCallback;
var _StatusMessageCallback = _FriendActionCallback;
var _UserStatusCallback    = ffi.Function('void', [ _ToxPtr, 'int32', 'uint8', 'pointer' ]);
var _TypingChangeCallback  = _UserStatusCallback;
var _ReadReceiptCallback   = ffi.Function('void', [ _ToxPtr, 'int32', 'uint32', 'pointer' ]);
var _ConnectionStatusCallback = _UserStatusCallback;
var _AvatarInfoCallback    = ffi.Function('void', [ _ToxPtr, 'int32', 'uint8', _HashBufferPtr, 'pointer' ]);
var _AvatarDataCallback    = ffi.Function('void', [ _ToxPtr, 'int32', 'uint8', _HashBufferPtr, _AvatarDataBufferPtr, 'uint32', 'pointer' ]);
var _GroupInviteCallback   = ffi.Function('void', [ _ToxPtr, 'int32', 'uint8', _MaxSizeBufferPtr, 'uint16', 'pointer' ]); // Unsure of buffer length
var _GroupMessageCallback  = ffi.Function('void', [ _ToxPtr, 'int', 'int', _MessageBufferPtr, 'uint16', 'pointer' ]); // May need buffer of different size
var _GroupActionCallback   = _GroupMessageCallback; // Different size than message?
var _GroupNamelistChangeCallback = ffi.Function('void', [ _ToxPtr, 'int', 'int', 'uint8', 'pointer' ]);

/**
 * Whether or not a variable is a non-negative integer.
 * @param {Number} n Variable to check
 * @return true if non-negative integer, false otherwise
 */
var isNonNeg = function(n) {
  return ((typeof n) === 'number' && isFinite(n) && (n % 1) === 0 && n >= 0);
};

/**
 * Helper for async functions that pass data through a callback in
 * the form of (Error, Buffer). Will translate the Buffer to a hex
 * String and pass that instead.
 * @param {Function} asyncFunc Asynchronous function to call
 * @param {Callback} callback
 */
var _helperBufferToHex = function(asyncFunc, callback) {
  asyncFunc(function(err, buffer) {
    if(callback) {
      callback(err, buffer.toHex().toString());
    }
  });
};

/**
 * Helper for sync functions that return a Buffer. Will translate
 * the Buffer to a hex String and return that instead.
 * @param {Function} syncFunction Synchronous function to get Buffer from
 */
var _helperBufferToHexSync = function(syncFunction) {
  var addr = syncFunction();
  return addr.toHex().toString();
};

/**
 * Creates a Tox instance and provides wrapper methods for functions
 * described in <tox/tox.h>.
 * @class
 * @param {Object} opts      Options
 * @param {String} opts.path Path to libtoxcore shared object
 */
var Tox = function(opts) {
  if(!opts) opts = {};
  var libpath = opts['path'];

  this.toxcore = this.createCoreLibrary(libpath);
  this.loaded = false;
  this.emitter = new events.EventEmitter();

  // Better fix for node-ffi gc issue
  this.ffiCallbacks = {};

  this.initHandle(); // Initialize handle via tox_new
  this.initCallbacks();
}

/**
 * Check if this Tox instance has a handle associated with it.
 * @param callback Callback to pass Error object to if no handle
 * @return true if has handle (no error), false if no handle (error)
 */
Tox.prototype.checkHandle = function(callback) {
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
 */
Tox.prototype.checkHandleSync = function() {
  if(!this.hasHandle()) {
    var err = new Error('No toxcore handle');
    err.code = 'NO_HANDLE';
    throw err;
  }
};

/**
 * Create a libtoxcore Library instance. If given a path, use the
 * specified path, otherwise use the default name.
 * @param {String} [libpath='libtoxcore'] - Path to libtoxcore
 * @return {Object}
 */
Tox.prototype.createCoreLibrary = function(libpath) {
  libpath = libpath || 'libtoxcore';
  return ffi.Library(libpath, {
    'tox_add_friend':           [ 'int32', [ _ToxPtr, _UInt8Ptr, _UInt8Ptr, 'uint16' ] ],
    'tox_add_friend_norequest': [ 'int32', [ _ToxPtr, _UInt8Ptr ] ],
    'tox_add_groupchat':        [ 'int',   [ _ToxPtr ] ],
    'tox_callback_friend_request':    [ 'void', [ _ToxPtr, _FriendRequestCallback, 'pointer' ] ],
    'tox_callback_friend_message':    [ 'void', [ _ToxPtr, _FriendMessageCallback, 'pointer' ] ],
    'tox_callback_friend_action':     [ 'void', [ _ToxPtr, _FriendActionCallback, 'pointer' ] ],
    'tox_callback_name_change':       [ 'void', [ _ToxPtr, _NameChangeCallback, 'pointer' ] ],
    'tox_callback_status_message':    [ 'void', [ _ToxPtr, _StatusMessageCallback, 'pointer' ] ],
    'tox_callback_user_status':       [ 'void', [ _ToxPtr, _UserStatusCallback, 'pointer' ] ],
    'tox_callback_typing_change':     [ 'void', [ _ToxPtr, _TypingChangeCallback, 'pointer' ] ],
    'tox_callback_read_receipt':      [ 'void', [ _ToxPtr, _ReadReceiptCallback, 'pointer' ] ],
    'tox_callback_connection_status': [ 'void', [ _ToxPtr, _ConnectionStatusCallback, 'pointer' ] ],
    'tox_callback_avatar_info':       [ 'void', [ _ToxPtr, _AvatarInfoCallback, 'pointer' ] ],
    'tox_callback_avatar_data':       [ 'void', [ _ToxPtr, _AvatarDataCallback, 'pointer' ] ],
    'tox_callback_group_invite':      [ 'void', [ _ToxPtr, _GroupInviteCallback, 'pointer' ] ],
    'tox_callback_group_message':     [ 'void', [ _ToxPtr, _GroupMessageCallback, 'pointer' ] ],
    'tox_callback_group_action':      [ 'void', [ _ToxPtr, _GroupActionCallback, 'pointer' ] ],
    'tox_callback_group_namelist_change': [ 'void', [ _ToxPtr, _GroupNamelistChangeCallback, 'pointer' ] ],
    'tox_count_chatlist':     [ 'uint32', [ _ToxPtr ] ],
    'tox_count_friendlist':   [ 'uint32', [ _ToxPtr ] ],
    'tox_del_friend':         [ 'int',    [ _ToxPtr, 'int32' ] ],
    'tox_del_groupchat':      [ 'int',    [ _ToxPtr, 'int' ] ],
    'tox_do':                 [ 'void',   [ _ToxPtr ] ],
    'tox_do_interval':        [ 'uint32', [ _ToxPtr ] ],
    'tox_friend_exists':      [ 'int',    [ _ToxPtr, 'int32' ] ],
    'tox_get_address':        [ 'void',   [ _ToxPtr, _UInt8Ptr ] ],
    'tox_get_chatlist':       [ 'uint32', [ _ToxPtr, _Int32Ptr, 'uint32' ] ],
    'tox_get_client_id':      [ 'int',    [ _ToxPtr, 'int32', _UInt8Ptr ] ],
    'tox_get_friendlist':     [ 'uint32', [ _ToxPtr, _UInt32Ptr, 'uint32' ] ],
    'tox_get_keys':           [ 'void',   [ _ToxPtr, _UInt8Ptr, _UInt8Ptr ] ],
    'tox_get_last_online':    [ 'uint64', [ _ToxPtr, 'int32' ] ],
    'tox_get_name':           [ 'int',    [ _ToxPtr, 'int32', _UInt8Ptr ] ],
    'tox_get_self_avatar':    [ 'int',    [ _ToxPtr, _UInt8Ptr, _UInt8Ptr, _UInt32Ptr, 'uint32', _UInt8Ptr ] ],
    'tox_get_self_name':      [ 'uint16', [ _ToxPtr, _UInt8Ptr ] ],
    'tox_get_self_name_size': [ 'int',    [ _ToxPtr ] ],
    'tox_get_self_status_message':      [ 'int', [ _ToxPtr, _UInt8Ptr, 'uint32' ] ],
    'tox_get_self_status_message_size': [ 'int', [ _ToxPtr ] ],
    'tox_get_self_user_status':         [ 'uint8', [ _ToxPtr ] ],
    'tox_get_status_message': [ 'int',    [ _ToxPtr, 'int32', _UInt8Ptr, 'uint32' ] ],
    'tox_group_action_send':  [ 'int',    [ _ToxPtr, 'int', _UInt8Ptr, 'uint16' ] ],
    'tox_group_get_names':    [ 'int',    [ _ToxPtr, 'int', _UInt8Ptr, _UInt16Ptr, 'uint16' ] ],
    'tox_group_message_send': [ 'int',    [ _ToxPtr, 'int', _UInt8Ptr, 'uint16' ] ],
    'tox_group_number_peers': [ 'int',    [ _ToxPtr, 'int' ] ],
    'tox_group_peername':     [ 'int',    [ _ToxPtr, 'int', 'int', _UInt8Ptr ] ],
    'tox_group_peernumber_is_ours': [ 'uint', [ _ToxPtr, 'int', 'int' ] ],
    'tox_hash':               [ 'int',    [ _UInt8Ptr, _UInt8Ptr, 'uint32' ] ],
    'tox_invite_friend':      [ 'int',    [ _ToxPtr, 'int32', 'int' ] ],
    'tox_join_groupchat':     [ 'int',    [ _ToxPtr, 'int32', _UInt8Ptr, 'uint16' ] ],
    'tox_kill':               [ 'void',   [ _ToxPtr ] ],
    'tox_load':               [ 'int',    [ _ToxPtr, _UInt8Ptr, 'uint32' ] ],
    'tox_new':                [ _ToxPtr,  [ _ToxOptionsPtr ] ],
    'tox_request_avatar_data':[ 'int',    [ _ToxPtr, 'int32' ] ],
    'tox_request_avatar_info':[ 'int',    [ _ToxPtr, 'int32' ] ],
    'tox_save':               [ 'void',   [ _ToxPtr, _UInt8Ptr ] ],
    'tox_send_avatar_info':   [ 'int',    [ _ToxPtr, 'int32' ] ],
    'tox_send_message':       [ 'uint32', [ _ToxPtr, 'int32', _UInt8Ptr, 'uint32' ] ],
    'tox_set_avatar':         [ 'int',    [ _ToxPtr, 'uint8', _UInt8Ptr, 'uint32' ] ],
    'tox_set_name':           [ 'int',    [ _ToxPtr, _UInt8Ptr, 'uint16' ] ],
    'tox_set_status_message': [ 'int',    [ _ToxPtr, _UInt8Ptr, 'uint16' ] ],
    'tox_set_user_status':    [ 'int',    [ _ToxPtr, 'uint8' ] ],
    'tox_size':               [ 'uint32', [ _ToxPtr ] ],
    'tox_unset_avatar':       [ 'int',    [ _ToxPtr ] ]
  });
};

Tox.prototype.initHandle = function() {
  var optsPtr = this.defaultToxOptions().ref();
  this.handle = this.toxcore.tox_new(optsPtr);

  // Free opts?
};

Tox.prototype.initCallbacks = function() {
  this.initFriendRequestCb();
  this.initFriendMessageCb();
  this.initFriendActionCb();
  this.initNameChangeCb();
  this.initStatusMessageCb();
  this.initUserStatusCb();
  this.initTypingChangeCb();
  this.initReadReceiptCb();
  this.initConnectionStatusCb();
  this.initAvatarInfoCb();
  this.initAvatarDataCb();
  this.initGroupInviteCb();
  this.initGroupMessageCb();
  this.initGroupActionCb();
  this.initGroupNamelistChangeCb();
};

Tox.prototype.defaultToxOptions = function() {
  // Not sure how to do a quick zalloc?
  var opts = new _ToxOptions();
  opts.ipv6enabled = 0;
  opts.udp_disabled = 0;
  opts.proxy_enabled = 0;
  opts.proxy_port = 0;

  // Uhh...
  for(var i = 0; i < opts.proxy_address.length; i++)
    opts.proxy_address[i] = 0;

  return opts;
};

/**
 * Clear handle (sets to undefined).
 */
Tox.prototype.clearHandle = function() {
  this.handle = undefined;
};

/**
 * Check if this Tox instance has a handle.
 * @return true if handle, false if none
 */
Tox.prototype.hasHandle = function() {
  return (this.handle !== undefined);
};

/**
 * Asynchronous tox_count_friendlist(3).
 */
Tox.prototype.countFriendList = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_count_friendlist.async(this.handle, callback);
};

/**
 * Synchronous tox_count_friendlist(3).
 */
Tox.prototype.countFriendListSync = function() {
  this.checkHandleSync();
  return this.toxcore.tox_count_friendlist(this.handle);
};

/**
 * Asynchronous tox_do(3).
 */
Tox.prototype.do = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_do.async(this.handle, callback);
};

/**
 * Synchronous tox_do(3).
 */
Tox.prototype.doSync = function() {
  this.checkHandleSync();
  this.toxcore.tox_do(this.handle);
};

/**
 * Asynchronous tox_do_interval(3).
 */
Tox.prototype.getDoInterval = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_do_interval(this.handle, callback);
};

/**
 * Synchronous tox_do_interval(3).
 */
Tox.prototype.getDoIntervalSync = function() {
  this.checkHandleSync();
  return this.toxcore.tox_do_interval(this.handle);
};

/**
 * Asynchronous tox_kill(3).
 */
Tox.prototype.kill = function(callback) {
  var tox = this;

  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_kill.async(this.handle, function(err) {
    if(!err) {
      tox.clearHandle();
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_kill(3).
 */
Tox.prototype.killSync = function() {
  this.checkHandleSync();
  this.toxcore.tox_kill(this.handle);
  this.clearHandle();
};

/**
 * Asynchronously load state from a tox file.
 * @param {String} filepath
 * @todo Call tox_load asynchronously (have a separate function)
 * @todo Fix error conventions
 */
Tox.prototype.load = function(filepath, callback) {
  var tox = this;

  if(!this.checkHandle(callback)) {
    return;
  }

  fs.stat(filepath, function(err, stats) {

    // Error with fs.stat, or isn't a file
    if(err || !stats.isFile()) {
      console.log("not a file or doesn't exist: " + filepath);
      if(callback) callback(false);
      return;
    }

    fs.readFile(filepath, function(err, data) {

      // Error with fs.readFile
      if(err) {
        if(callback) callback(false);
        return;
      }

      var retval = tox.toxcore.tox_load(tox.handle, data, data.length);

      tox.loaded = (retval === 0 ? true : false);
      if(callback) callback(tox.loaded);
    });
  });

};

/**
 * Asynchronously save state to a tox file.
 * @param {String} filepath
 * @todo Call tox_save asynchronously (have a separate function)
 * @todo Fix error conventions
 */
Tox.prototype.save = function(filepath, callback) {
  var tox = this;
  var bufsize = this.sizeSync();

  if(!this.hasHandle() || !bufsize) {
    if(callback) callback(false);
    return;
  }

  var buf = new Buffer(bufsize);
  this.toxcore.tox_save(this.handle, buf);

  fs.writeFile(filepath, buf, { mode: 0600 }, function(err) {

    // Error with fs.writeFile
    if(err) {
      if(callback) callback(false);
      return;
    }

    if(callback) callback(true);
  });
};

/**
 * Asynchronous tox_send_message(3).
 * @param {String} message
 * @param {Number} friend
 */
Tox.prototype.sendMessage = function(message, friend, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buffer = new Buffer(message);
  this.toxcore.tox_send_message.async(this.handle, friend, buffer, buffer.length, callback);
};

/**
 * Synchronous tox_send_message(3).
 * @param {String} message
 * @param {Number} friend
 * @return {Number} Receipt
 */
Tox.prototype.sendMessageSync = function(message, friend) {
  this.checkHandleSync();

  // Todo: Checks (friend number, message length, etc.)

  var buffer = new Buffer(message);
  var receipt = this.toxcore.tox_send_message(this.handle, friend, buffer, buffer.length);
  return receipt;
};

/**
 * Asynchronous tox_friend_exists(3).
 * @param {Number} friend
 */
Tox.prototype.hasFriend = function(friend, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_friend_exists.async(this.handle, friend, function(err, res) {
    if(callback) {
      callback(err, res === 1);
    }
  });
};

/**
 * Synchronous tox_friend_exists(3).
 * @param {Number} friend
 */
Tox.prototype.hasFriendSync = function(friend) {
  this.checkHandleSync();
  var ret = this.toxcore.tox_friend_exists(this.handle, friend);
  return (ret === 1);
};

/**
 * Asynchronous tox_get_friendlist(3).
 */
Tox.prototype.getFriendList = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var toxcore = this.toxcore, handle = this.handle;
  this.countFriendList(function(err, count) {
    if(!err) {
      var arr = new (RefArray('uint32'))(count);
      toxcore.tox_get_friendlist.async(handle, arr.buffer, count, function(err, res) {
        // Maybe check: res === count
        var list;

        if(!err) {
          list = [];
          for(var i = 0; i < arr.length; i++) {
            list[i] = arr[i];
          }
        }

        if(callback) {
          callback(err, list);
        }
      });
    } else if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_get_friendlist(3).
 */
Tox.prototype.getFriendListSync = function() {
  this.checkHandleSync();

  var count = this.countFriendListSync();
  var arr = new (RefArray('uint32'))(count);
  var retval = this.toxcore.tox_get_friendlist(this.handle, arr.buffer, count);

  if(retval != count) console.log("getFriendListSync: " + retval + " != " + count);

  // Copy to javascript array
  var jarr = [];
  for(var i = 0; i < arr.length; i++)
    jarr[i] = arr[i];

  return jarr;
};

/**
 * Asynchronous tox_add_friend(3).
 * @param {String} addr    Address as hex string
 * @param {String} message Message to send with request
 * @todo Accept Buffer type for {@param addr}
 */
Tox.prototype.addFriend = function(addr, message, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  if(!(/^[0-9a-f]+$/i.test(addr) && addr.length === (TOX_FRIEND_ADDRESS_SIZE * 2))) {
    var err = new Error('Invalid address');
    err.code = 'INVALID_ADDRESS';
    if(callback) {
      callback(err);
    }
    return;
  }

  if(!_.isString(message)) {
    message = '';
  }

  var addrbuf = (new Buffer(addr)).fromHex(),
      msgbuf = new Buffer(message);

  this.toxcore.tox_add_friend.async(this.handle, addrbuf, msgbuf, msgbuf.length, function(err, res) {
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_add_friend');
      err.tox = { name: 'tox_add_friend', returned: res };
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_add_friend(3).
 * @param {String} addr    Address as hex string
 * @param {String} message Message to send with request
 * @todo Accept Buffer type for {@param addr}
 * @todo Just return friend number, as an Error is now
 *       thrown if tox_add_friend returns negative.
 * @todo Clean
 */
Tox.prototype.addFriendSync = function(addr, message) {
  this.checkHandleSync();

  if(addr.length !== (TOX_FRIEND_ADDRESS_SIZE * 2)) {
    return { success: false };
  }

  var addrbuf = util.fromHex(addr);

  if(addrbuf.length !== TOX_FRIEND_ADDRESS_SIZE) {
    return { success: false };
  }

  // Todo: Message length check?

  if(message === undefined) {
    message = "";
  }

  var msgbuf = new Buffer(message);

  var friend = this.toxcore.tox_add_friend(this.handle, addrbuf, msgbuf, msgbuf.length);
  if(friend < 0) {
    var err = new Error('Negative return value for tox_add_friend');
    err.tox = { name: 'tox_add_friend', returned: res };
    throw err;
  }

  return { success: true, friend_number: friend };
};

/**
 * Asynchronous tox_add_friend_norequest(3).
 * @param {Buffer} pubkeybuf
 */
Tox.prototype.addFriendNoRequest = function(pubkeybuf, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_add_friend_norequest.async(this.handle, pubkeybuf, function(err, res) {
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_add_friend_norequest');
      err.tox = { name: 'tox_add_friend_norequest', returned: res };
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_add_friend_norequest(3).
 * @param {Buffer} pubkeybuf
 * @todo Throw error if negative return value, fix return
 */
Tox.prototype.addFriendNoRequestSync = function(pubkeybuf) {
  this.checkHandleSync();
  var num = this.toxcore.tox_add_friend_norequest(this.handle, pubkeybuf);

  if(num > -1) {
    return { success: true, friend_number: num };
  }
  else {
    return { success: false, error_code: num };
  }
};

/**
 * Asynchronous tox_add_groupchat(3).
 */
Tox.prototype.addGroupchat = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_add_groupchat.async(this.handle, function(err, res) {
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_add_groupchat');
      err.tox = { name: 'tox_add_groupchat', returned: res };
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_add_groupchat(3).
 * @todo Throw error if negative return value, fix return
 */
Tox.prototype.addGroupchatSync = function() {
  this.checkHandleSync();
  var groupnum = this.toxcore.tox_add_groupchat(this.handle);

  if(groupnum >= 0) {
    return { success: true, group_number: groupnum };
  }
  else {
    return { success: false };
  }
};

/**
 * Asynchronous tox_group_peername(3).
 * @param {Number} groupnum
 * @param {Number} peernum
 */
Tox.prototype.getGroupchatPeername = function(groupnum, peernum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var namebuf = new Buffer(TOX_MAX_NAME_LENGTH);
  this.toxcore.tox_group_peername.async(this.handle, groupnum, peernum, namebuf, function(err, res) {
    var name;

    if(!err && res < 0) {
      err = new Error('Negative return value for tox_group_peername');
      err.tox = { name: 'tox_group_peername', returned: res };
    }

    if(!err) {
      name = namebuf.slice(0, res).toString();
    }

    if(callback) {
      callback(err, name);
    }
  });
};

/**
 * Synchronous tox_group_peername(3).
 * @param {Number} groupnum
 * @param {Number} peernum
 * @todo Throw error if negative return value, fix return
 */
Tox.prototype.getGroupchatPeernameSync = function(groupnum, peernum) {
  this.checkHandleSync();
  var namebuf = new Buffer(TOX_MAX_NAME_LENGTH);
  var len = this.toxcore.tox_group_peername(this.handle, groupnum, peernum, namebuf);

  if(len >= 0) {
    var name = namebuf.slice(0, len).toString();
    return { success: true, name: name };
  }
  else {
    return { success: false };
  }
};

/**
 * Asynchronous tox_invite_friend(3).
 * @param {Number} friendnum
 * @param {Number} groupnum
 */
Tox.prototype.invite = function(friendnum, groupnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_invite_friend.async(this.handle, friendnum, groupnum, function(err, res) {
    var success;

    if(!err && res !== 0) {
      err = new Error('Non-zero return value for tox_invite_friend');
      err.tox = { name: 'tox_invite_friend', returned: res };
    }

    if(!err) {
      success = (res === 0);
    }

    if(callback) {
      callback(err, success);
    }
  });
};

/**
 * Synchronous tox_invite_friend(3).
 * @param {Number} friendnum
 * @param {Number} groupnum
 * @todo Throw error if non-zero return value, fix return
 */
Tox.prototype.inviteSync = function(friendnum, groupnum) {
  this.checkHandleSync();
  var success = this.toxcore.tox_invite_friend(this.handle, friendnum, groupnum);
  return (success === 0);
};

/**
 * Asynchronous tox_join_groupchat(3).
 * @param {Number} friendnum
 * @param {Buffer} data
 */
Tox.prototype.joinGroupchat = function(friendnum, data, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_join_groupchat.async(this.handle, friendnum, data, data.length, function(err, res) {
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_join_groupchat');
      err.tox = { name: 'tox_join_groupchat', returned: res };
    }
  });
};

/**
 * Synchronous tox_join_groupchat(3).
 * @param {Number} friendnum
 * @param {Buffer} data
 * @todo Throw error if negative return value, fix return
 */
Tox.prototype.joinGroupchatSync = function(friendnum, data) {
  this.checkHandleSync();

  var groupnum = this.toxcore.tox_join_groupchat(this.handle, friendnum, data, data.length);

  if(groupnum >= 0) {
    return { success: true, group_number: groupnum };
  }
  else {
    return { success: false };
  }
};

/**
 * Asynchronous tox_group_message_send(3).
 * @param {Number} groupnum
 * @param {String} message
 */
Tox.prototype.sendGroupchatMessage = function(groupnum, message, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buffer = new Buffer(message);
  this.toxcore.tox_group_message_send.async(this.handle, groupnum, buffer, buffer.length, function(err, res) {
    if(!err && res !== 0) {
      err = new Error('Non-zero return value for tox_group_message_send');
      err.tox = { name: 'tox_group_message_send', returned: res };
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_group_message_send(3).
 * @param {Number} groupnum
 * @param {String} message
 * @todo Throw error if non-zero return value, fix return
 */
Tox.prototype.sendGroupchatMessageSync = function(groupnum, message) {
  this.checkHandleSync();
  var buffer = new Buffer(message);
  var success = this.toxcore.tox_group_message_send(this.handle, groupnum, buffer, buffer.length);
  return (success === 0);
};

/**
 * Asynchronous tox_group_action_send(3).
 * @param {Number} groupnum
 * @param {String} action
 */
Tox.prototype.sendGroupchatAction = function(groupnum, action, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buffer = new Buffer(action);
  this.toxcore.tox_group_action_send(this.handle, groupnum, buffer, buffer.length, function(err, res) {
    if(!err && res !== 0) {
      err = new Error('Non-zero return value for tox_group_action_send');
      err.tox = { name: 'tox_group_action_send', returned: res };
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_group_action_send(3).
 * @param {Number} groupnum
 * @param {String} action
 * @todo Throw error if non-zero return value, fix return
 */
Tox.prototype.sendGroupchatActionSync = function(groupnum, action) {
  this.checkHandleSync();
  var success = this.toxcore.tox_group_action_send(this.handle, groupnum, action, action.length);
  return (success === 0);
};

/**
 * Asynchronous tox_group_peernumber_is_ours(3).
 * @param {Number} groupnum
 * @param {Number} peernum
 */
Tox.prototype.peernumberIsOurs = function(groupnum, peernum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_group_peernumber_is_ours.async(this.handle, groupnum, peernum, function(err, res) {
    var is;
    if(!err) {
      is = (res === 1);
    }

    if(callback) {
      callback(err, is);
    }
  });
};

/**
 * Synchronous tox_group_peernumber_is_ours(3).
 * @param {Number} groupnum
 * @param {Number} peernum
 */
Tox.prototype.peernumberIsOursSync = function(groupnum, peernum) {
  this.checkHandleSync();
  var ours = this.toxcore.tox_group_peernumber_is_ours(this.handle, groupnum, peernum);
  return (ours === 1);
};

/**
 * Asynchronous tox_group_number_peers(3).
 * @param {Number} groupnum
 */
Tox.prototype.getGroupchatPeerCount = function(groupnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_group_number_peers.async(this.handle, groupnum, function(err, res) {
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_group_number_peers');
      err.tox = { name: 'tox_group_number_peers', returned: res };
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_group_number_peers(3).
 * @param {Number} groupnum
 * @todo Throw error if negative return value, fix return
 */
Tox.prototype.getGroupchatPeerCountSync = function(groupnum) {
  this.checkHandleSync();
  var count = this.toxcore.tox_group_number_peers(this.handle, groupnum);

  if(count >= 0) {
    return { success: true, count: count };
  }
  else {
    return { success: false };
  }
};

/**
 * Asynchronous tox_group_get_names(3).
 * @param {Number} groupnum
 */
Tox.prototype.getGroupchatPeerNames = function(groupnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  // Get count
  var tox = this;
  this.getGroupchatPeerCount(groupnum, function(err, count) {
    if(!err) {
      // If no peers, just return empty array
      if(count === 0) {
        if(callback) {
          callback(err, []);
        }
        return;
      }

      var namesarr = new Buffer(TOX_MAX_NAME_LENGTH * count),
          lengthsarr = new (RefArray('uint16'))(count);
      namesarr.fill(0);

      tox.toxcore.tox_group_get_names.async(
        tox.handle, groupnum, namesarr, lengthsarr.buffer, count,
        function(err, res) {
          if(!err && res < 0) {
            err = new Error('Negative return value for tox_group_get_names');
            err.tox = { name: 'tox_group_get_names', returned: res };
          }

          var names;
          if(!err) {
            names = [];
            for(var i = 0; i < res; i++) {
              var start = (TOX_MAX_NAME_LENGTH * i),
                  len = lengthsarr[i],
                  end = (start + len);

              namebuf = namesarr.slice(start, end);
              console.log('[Groupchats] Peer name (length ' + len + '): ' + namebuf.toString());

              names.push(namebuf.toString());
            }
          }

          if(callback) {
            callback(err, names);
          }
      });
    } else if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_group_get_names(3).
 * @param {Number} groupnum
 * @todo Throw error when necessary, fix return
 */
Tox.prototype.getGroupchatPeerNamesSync = function(groupnum) {
  this.checkHandleSync();

  // Get count
  var result = this.getGroupchatPeerCountSync(groupnum);
  if(!result || !result.success) {
    return { success: false };
  }
  var count = result.count;

  if(count === 0) {
    return { success: true, names: [] };
  }

  var namesarr = new Buffer(TOX_MAX_NAME_LENGTH * count);
  namesarr.fill(0);
  var lengthsarr = new (RefArray('uint16'))(count);

  var peers = this.toxcore.tox_group_get_names(this.handle, groupnum, namesarr, lengthsarr.buffer, count);

  if(peers < 0) {
    return { success: false };
  }

  var names = [];
  for(var i = 0; i < peers; i++) {
    var start = (TOX_MAX_NAME_LENGTH * i),
        len = lengthsarr[i],
        end = (start + len);

    namebuf = namesarr.slice(start, end);
    console.log('[Groupchats] Peer name (length ' + len + '): ' + namebuf.toString());

    names.push(namebuf.toString());
  }

  return { success: true, names: names };
};

/**
 * Asynchronous tox_count_chatlist(3).
 */
Tox.prototype.getGroupchatCount = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_count_chatlist.async(this.handle, callback);
};

/**
 * Synchronous tox_count_chatlist(3).
 */
Tox.prototype.getGroupchatCountSync = function() {
  this.checkHandleSync();
  return this.toxcore.tox_count_chatlist(this.handle);
};

/**
 * Asynchronous tox_get_chatlist(3).
 */
Tox.prototype.getGroupchats = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var tox = this;
  this.getGroupchatCount(function(err, res) {
    if(!err) {
      var chatsarr = new (RefArray('int32'))(count);
      tox.toxcore.tox_get_chatlist.async(tox.handle, chatsarr, res, function(err, res) {
        var chats;
        if(!err) {
          chats = [];
          for(var i = 0; i < res; i++) {
            chats.push(chatsarr[i]);
          }
        }

        if(callback) {
          callback(err, chats);
        }
      });
    } else if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_get_chatlist(3).
 */
Tox.prototype.getGroupchatsSync = function() {
  this.checkHandleSync();

  var count = this.getGroupchatCountSync();
  var chatsarr = new (RefArray('int32'))(count);

  var num = this.toxcore.tox_get_chatlist(this.handle, chatsarr, count);

  var chats = [];
  for(var i = 0; i < num; i++) {
    chats.push(chatsarr[i]);
  }

  return chats;
};

/**
 * Asynchronous tox_del_groupchat(3).
 * @param {Number} groupnum
 */
Tox.prototype.deleteGroupchat = function(groupnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_del_groupchat.async(this.handle, groupnum, function(err, res) {
    var success;
    if(!err) {
      success = (res === 0);
    }

    if(callback) {
      callback(err, success);
    }
  });
};

/**
 * Synchronous tox_del_groupchat(3).
 * @param {Number} groupnum
 * @todo Throw error if non-zero return value, fix return
 */
Tox.prototype.deleteGroupchatSync = function(groupnum) {
  this.checkHandleSync();
  var success = this.toxcore.tox_del_groupchat(this.handle, groupnum);
  return (success === 0);
};

/**
 * Asynchronous tox_del_friend(3).
 * @param {Number} friendnum
 */
Tox.prototype.deleteFriend = function(friendnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_del_friend.async(this.handle, friendnum, function(err, res) {
    var success;
    if(!err) {
      success = (res === 0);
    }

    if(callback) {
      callback(err, success);
    }
  });
};

/**
 * Synchronous tox_del_friend(3).
 * @param {Number} friendnum
 * @todo Throw error if non-zero return value, fix return
 */
Tox.prototype.deleteFriendSync = function(friendnum) {
  this.checkHandleSync();
  var result = this.toxcore.tox_del_friend(this.handle, friendnum);
  return (result === 0);
};

/**
 * Asynchronous tox_get_client_id(3).
 * @param {Number} friendnum
 */
Tox.prototype.getFriendPublicKey = function(friendnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buf = new Buffer(TOX_KEY_SIZE);
  this.toxcore.tox_get_client_id.async(this.handle, friendnum, buf, function(err, res) {
    var success;
    if(!err && res !== 0) {
      err = new Error('Non-zero return value for tox_get_client_id');
      err.tox = { name: 'tox_get_client_id', returned: res };
    }

    if(callback) {
      callback(err, buf);
    }
  });
};

/**
 * Synchronous tox_get_client_id(3).
 * @param {Number} friendnum
 * @return {Buffer}
 */
Tox.prototype.getFriendPublicKeySync = function(friendnum) {
  this.checkHandleSync();
  var buf = new Buffer(TOX_KEY_SIZE);
  var retval = this.toxcore.tox_get_client_id(this.handle, friendnum, buf);

  if(retval >= 0) return buf;
  else return;
};

/**
 * Asynchronous tox_get_self_name(3).
 */
Tox.prototype.getName = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buf = new Buffer(TOX_MAX_NAME_LENGTH);
  this.toxcore.tox_get_self_name.async(this.handle, buf, function(err, res) {
    var name;
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_get_self_name');
      err.tox = { name: 'tox_get_self_name', returned: res };
    }

    if(!err) {
      name = buf.toString('utf8', 0, res);
    }

    if(callback) {
      callback(err, name);
    }
  });
};

/**
 * Synchronous tox_get_self_name(3).
 * @todo Throw error if negative return value, fix return
 */
Tox.prototype.getNameSync = function() {
  this.checkHandleSync();

  var namebuf = new Buffer(TOX_MAX_NAME_LENGTH);
  namebuf.set(0);
  var retval = this.toxcore.tox_get_self_name(this.handle, namebuf);

  // Should return length as a positive int
  if(retval <= 0) return;

  return namebuf.toString('utf8', 0, retval);
};

/**
 * Asynchronous tox_get_self_status_message(3).
 */
Tox.prototype.getStatusMessage = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buf = new Buffer(TOX_MAX_STATUS_MESSAGE_LENGTH);
  this.toxcore.tox_get_self_status_message.async(this.handle, buf, function(err, res) {
    var message;
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_get_self_status_message');
      err.tox = { name: 'tox_get_self_status_message', returned: res };
    }

    if(!err) {
      message = buf.toString('utf8', 0, res);
    }

    if(callback) {
      callback(err, message);
    }
  });
};

/**
 * Synchronous tox_get_self_status_message(3).
 * @todo Throw error if negative return value, fix return
 */
Tox.prototype.getStatusMessageSync = function() {
  this.checkHandleSync();

  var statusbuf = new Buffer(TOX_MAX_STATUS_MESSAGE_LENGTH);
  statusbuf.set(0);
  var retval = this.toxcore.tox_get_self_status_message(this.handle, statusbuf, statusbuf.length);

  // Returns -1 on failure, non-negative length as int
  if(retval < 0) return;

  return statusbuf.toString('utf8', 0, retval);
};

/**
 * Asynchronous tox_get_keys(3). If {@param includePriv} is passed as
 * false, undefined is returned for the private key Buffer.
 * @param {Boolean} includePriv Whether or not to include the private key
 * @todo Support just callback as argument (includePriv default: false)
 */
Tox.prototype.getKeys = function(includePriv, callback) {
  includePriv = (includePriv === true);

  var publicBuf = new Buffer(TOX_KEY_SIZE);
  var privateBuf = (includePriv ? new Buffer(TOX_KEY_SIZE) : ref.NULL);

  this.toxcore.tox_get_keys.async(this.handle, publicBuf, privateBuf, function(err) {
    if(!includePriv) {
      privateBuf = undefined;
    }

    if(callback) {
      callback(err, publicBuf, privateBuf);
    }
  });
};

/**
 * Synchronous tox_get_keys(3).
 * @param {Boolean} includePriv Whether or not to include the private key
 * @return {Buffer[]} Array of keys, with only one key if no private key
 */
Tox.prototype.getKeysSync = function(includePriv) {
  includePriv = (includePriv === true);

  var publicBuf = new Buffer(TOX_KEY_SIZE);
  var privateBuf = (includePriv ? new Buffer(TOX_KEY_SIZE) : ref.NULL);

  this.toxcore.tox_get_keys(this.handle, publicBuf, privateBuf);

  var keys = [publicBuf];
  if(includePriv) {
    keys.push(privateBuf);
  }

  return keys;
};

/**
 * Asynchronously get the private key.
 */
Tox.prototype.getPrivateKey = function(callback) {
  this.getKeys(true, function(err, pubkey, key) {
    if(callback) {
      callback(err, key);
    }
  });
};

/**
 * Synchronously get the private key.
 * @return {Buffer} Private key
 */
Tox.prototype.getPrivateKeySync = function() {
  return this.getKeysSync(true)[1];
};

/**
 * Asynchronously get the public key.
 */
Tox.prototype.getPublicKey = function(callback) {
  this.getKeys(false, callback);
};

/**
 * Synchronously get the public key.
 * @return {Buffer} Public key
 */
Tox.prototype.getPublicKeySync = function() {
  return this.getKeysSync(false)[0];
};

/**
 * Asynchronous tox_get_address(3).
 */
Tox.prototype.getAddress = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buf = new Buffer(TOX_FRIEND_ADDRESS_SIZE);
  this.toxcore.tox_get_address.async(this.handle, buf, function(err) {
    if(callback) {
      callback(err, buf);
    }
  });
};

/**
 * Synchronous tox_get_address(3).
 * @return {Buffer}
 */
Tox.prototype.getAddressSync = function() {
  this.checkHandleSync();

  var addrbuf = new Buffer(TOX_FRIEND_ADDRESS_SIZE);
  this.toxcore.tox_get_address(this.handle, addrbuf);

  return addrbuf;
};

/**
 * Asynchronously get the public key of a friend as a hex string.
 * @param {Number} friendnum
 */
Tox.prototype.getFriendPublicKeyHex = function(friendnum, callback) {
  _helperBufferToHex(this.getFriendPublicKey.bind(this, friendnum), callback);
};

/**
 * Synchronously get the public key of a friend as a hex string.
 * @param {Number} friendnum
 * @return {String} Public key hex string
 */
Tox.prototype.getFriendPublicKeyHexSync = function(friendnum) {
  return _helperBufferToHexSync(this.getFriendPublicKeySync.bind(this, friendnum));
};

/**
 * Asynchronously get the private key as a hex string.
 */
Tox.prototype.getPrivateKeyHex = function(callback) {
  _helperBufferToHex(this.getPrivateKey.bind(this), callback);
};

/**
 * Synchronously get the private key as a hex string.
 * @return {String} Private key hex string
 */
Tox.prototype.getPrivateKeyHexSync = function() {
  return _helperBufferToHexSync(this.getPrivateKeySync.bind(this));
};

/**
 * Asynchronously get the public key as a hex string.
 */
Tox.prototype.getPublicKeyHex = function(callback) {
  _helperBufferToHex(this.getPublicKey.bind(this), callback);
};

/**
 * Synchronously get the public key as a hex string.
 * @return {String} Public key hex string
 */
Tox.prototype.getPublicKeyHexSync = function() {
  return _helperBufferToHexSync(this.getPublicKeySync.bind(this));
};

/**
 * Asynchronously get the address as a hex string.
 */
Tox.prototype.getAddressHex = function(callback) {
  _helperBufferToHex(this.getAddress.bind(this), callback);
};

/**
 * Synchronously get the address as a hex string.
 * @return {String} Address hex string
 */
Tox.prototype.getAddressHexSync = function() {
  return _helperBufferToHexSync(this.getAddressSync.bind(this));
};

/**
 * Asynchronous tox_get_last_online(3).
 * @param {Number} friendnum
 */
Tox.prototype.getFriendLastOnline = function(friendnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_get_last_online.async(this.handle, friendnum, function(err, res) {
    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_get_last_online(3).
 * @param {Number} friendnum
 */
Tox.prototype.getFriendLastOnlineSync = function(friendnum) {
  this.checkHandleSync();
  return this.toxcore.tox_get_last_online(this.handle, friendnum);
};

/**
 * Asynchronous tox_get_self_user_status(3).
 */
Tox.prototype.getUserStatus = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_get_self_user_status.async(this.handle, function(err, res) {
    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_get_self_user_status(3).
 * @return {Number} User status
 */
Tox.prototype.getUserStatusSync = function() {
  this.checkHandleSync();
  return this.toxcore.tox_get_self_user_status(this.handle);
};

/**
 * Asynchronous tox_get_name(3).
 * @param {Number} friendnum
 */
Tox.prototype.getFriendName = function(friendnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buf = new Buffer(TOX_MAX_NAME_LENGTH);
  this.toxcore.tox_get_name(this.handle, friendnum, buf, function(err, res) {
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_get_name');
      err.tox = { name: 'tox_get_name', returned: res };
    }

    var name;
    if(!err) {
      name = buf.toString('utf8', 0, res);
    }

    if(callback) {
      callback(err, name);
    }
  });
};

/**
 * Synchronous tox_get_name(3).
 * @param {Number} friendnum
 * @return {String} Friend name
 * @todo Throw error if negative return value
 */
Tox.prototype.getFriendNameSync = function(friendnum) {
  this.checkHandleSync();

  if(!isNonNeg(friendnum)) return;

  var buf = new Buffer(TOX_MAX_NAME_LENGTH);
  var length = this.toxcore.tox_get_name(this.handle, friendnum, buf);

  if(length < 0) return;

  return buf.toString('utf8', 0, length);
};

/**
 * Asynchronous tox_get_status_message(3).
 * @param {Number} friendnum
 */
Tox.prototype.getFriendStatusMessage = function(friendnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buf = new Buffer(TOX_MAX_STATUS_MESSAGE_LENGTH);
  this.toxcore.tox_get_status_message.async(
    this.handle, friendnum, buf, buf.length, function(err, res) {
    if(!err && res < 0) {
      err = new Error('Negative return value for tox_get_status_message');
      err.tox = { name: 'tox_get_status_message', returned: res };
    }

    var message;
    if(!err) {
      message = buf.toString('utf8', 0, res);
    }

    if(callback) {
      callback(err, message);
    }
  });
};

/**
 * Synchronous tox_get_status_message(3).
 * @param {Number} friendnum
 */
Tox.prototype.getFriendStatusMessageSync = function(friendnum) {
  this.checkHandleSync();

  var buf = new Buffer(TOX_MAX_STATUS_MESSAGE_LENGTH);
  var length = this.toxcore.tox_get_status_message(this.handle, friendnum, buf, buf.length);

  if(length < 0) return;

  return buf.toString('utf8', 0, length);
};

/**
 * Asynchronous tox_request_avatar_data(3).
 * @param {Number} friendnum
 */
Tox.prototype.requestAvatarData = function(friendnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_request_avatar_data.async(this.handle, friendnum, function(err, res) {
    if(callback) {
      callback(err, res === 0);
    }
  });
};

/**
 * Synchronous tox_request_avatar_data(3).
 * @param {Number} friendnum
 * @return {Boolean} true if successful, false if not
 * @todo Throw error instead of returning Boolean?
 */
Tox.prototype.requestAvatarDataSync = function(friendnum) {
  this.checkHandleSync();

  var result = this.toxcore.tox_request_avatar_data(this.handle, friendnum);
  return (result === 0);
};

/**
 * Asynchronous tox_request_avatar_info(3).
 * @param {Number} friendnum
 */
Tox.prototype.requestAvatarInfo = function(friendnum, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_request_avatar_info.async(this.handle, friendnum, function(err, res) {
    if(callback) {
      callback(err, res === 0);
    }
  });
};

/**
 * Synchronous tox_request_avatar_info(3).
 * @param {Number} friendnum
 * @return {Boolean} true if successful, false if not
 * @todo Throw error instead of returning Boolean?
 */
Tox.prototype.requestAvatarInfoSync = function(friendnum) {
  this.checkHandleSync();

  var result = this.toxcore.tox_request_avatar_info(this.handle, friendnum);
  return (result === 0);
};

/**
 * Asynchronous tox_set_avatar(3).
 * @param {Number} format Avatar format
 * @param {Buffer} buffer Avatar data
 */
Tox.prototype.setAvatar = function(format, buffer, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_set_avatar.async(
    this.handle, format, buffer, buffer.length, function(err, res) {
    if(callback) {
      callback(err, res === 0);
    }
  });
};

/**
 * Synchronous tox_set_avatar(3).
 * @param {Number} format Avatar format
 * @param {Buffer} buffer Avatar data
 * @return {Boolean} true if successful, false if not
 * @todo Throw error instead of returning Boolean?
 */
Tox.prototype.setAvatarSync = function(format, buffer) {
  this.checkHandleSync();

  var result = this.toxcore.tox_set_avatar(this.handle, format, buffer, buffer.length);
  return (result === 0);
};

/**
 * Asynchronous tox_unset_avatar(3).
 */
Tox.prototype.unsetAvatar = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_unset_avatar.async(this.handle, function(err, res) {
    if(callback) {
      callback(err, res === 0);
    }
  });
};

/**
 * Synchronous tox_unset_avatar(3).
 * @return {Boolean} true if successful, false if not
 * @todo Throw error instead of returning Boolean?
 */
Tox.prototype.unsetAvatarSync = function() {
  this.checkHandleSync();

  var result = this.toxcore.tox_unset_avatar(this.handle);
  return (result === 0);
};

/**
 * Asynchronous tox_set_name(3).
 * @param {String} name Name to set
 */
Tox.prototype.setName = function(name, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buf = new Buffer(name);
  this.toxcore.tox_set_name.async(this.handle, name, name.length, function(err, res) {
    if(callback) {
      callback(err, res === 0);
    }
  });
};

/**
 * Synchronous tox_set_name(3).
 * @param {String} name Name to set
 * @return {Boolean} true if successful, false if not
 */
Tox.prototype.setNameSync = function(name) {
  this.checkHandleSync();
  var namebuf = new Buffer(name);
  var retval = this.toxcore.tox_set_name(this.handle, namebuf, namebuf.length);
  return (retval === 0);
};

/**
 * Asynchronous tox_set_status_message(3).
 * @param {String} status Status message to set
 */
Tox.prototype.setStatusMessage = function(status, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  var buf = new Buffer(status);
  this.toxcore.tox_set_status_message.async(this.handle, buf, buf.length, function(err, res) {
    if(callback) {
      callback(err, res === 0);
    }
  });
};

/**
 * Synchronous tox_set_status_message(3).
 * @param {String} status Status message to set
 * @return {Boolean} true if successful, false if not
 */
Tox.prototype.setStatusMessageSync = function(status) {
  this.checkHandleSync();
  var statusbuf = new Buffer(status);
  var retval = this.toxcore.tox_set_status_message(this.handle, statusbuf, statusbuf.length);
  return (retval === 0);
};

/**
 * Asynchronous tox_set_user_status(3).
 * @param {Number} status User status to set
 */
Tox.prototype.setUserStatus = function(status, callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_set_user_status(this.handle, status, function(err, res) {
    if(callback) {
      callback(err, res === 0);
    }
  });
};

/**
 * Synchronous tox_set_user_status(3).
 * @param {Number} status User status to set
 * @return {Boolean} true if successful, false if not
 */
Tox.prototype.setUserStatusSync = function(status) {
  this.checkHandleSync();
  var retval = this.toxcore.tox_set_user_status(this.handle, status);
  return (retval === 0);
};

/**
 * Asynchronous tox_size(3).
 */
Tox.prototype.size = function(callback) {
  if(!this.checkHandle(callback)) {
    return;
  }

  this.toxcore.tox_size.async(this.handle, callback);
};

/**
 * Synchronous tox_size(3).
 * @return {Number} Size
 */
Tox.prototype.sizeSync = function() {
  this.checkHandleSync();
  return this.toxcore.tox_size(this.handle);
};

// Helper for node-ffi's Function to Callback
Tox.prototype.toFFICallback = function(ffiFunc, callback) {
  return ffi.Callback(ffiFunc.retType, ffiFunc.argTypes, callback);
};

Tox.prototype.storeFFICallback = function(key, callback) {
  if(this.ffiCallbacks[key] === undefined)
    this.ffiCallbacks[key] = [ callback ];
  else this.ffiCallbacks[key].push(callback);
};

/**
 * Wrapper method for emitter.emit. Isn't really meant to be used
 * outside of this file (maybe rename to _emit?).
 */
Tox.prototype.emit = function() {
  this.emitter.emit.apply(this.emitter, arguments);
};

/**
 * Wrapper method for emitter.on.
 */
Tox.prototype.on = function() {
  this.emitter.on.apply(this.emitter, arguments);
};

Tox.prototype.initFriendRequestCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, pubkeybuffer, data, length, userdata) {
    pubkeybuffer = pubkeybuffer.slice(0, TOX_KEY_SIZE);
    data = data.slice(0, length);

    tox.emit('friendRequest',
      new toxEvents.FriendRequestEvent(pubkeybuffer, data));
  };

  var cb = this.toFFICallback(_FriendRequestCallback, wrapper);
  this.storeFFICallback('FriendRequest', cb);

  this.toxcore.tox_callback_friend_request(this.handle, cb, ref.NULL);
};

Tox.prototype.initFriendMessageCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, msgbuf, length, userdata) {
    msgbuf = msgbuf.slice(0, length);

    tox.emit('friendMessage',
      new toxEvents.FriendMessageEvent(friend, msgbuf.toString()));
  };

  var cb = this.toFFICallback(_FriendMessageCallback, wrapper);
  this.storeFFICallback('FriendMessage', cb);

  this.toxcore.tox_callback_friend_message(this.handle, cb, ref.NULL);
};

Tox.prototype.initFriendActionCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, actionbuf, length, userdata) {
    actionbuf = actionbuf.slice(0, length);

    tox.emit('friendAction',
      new toxEvents.FriendActionEvent(friend, actionbuf.toString()));
  };

  var cb = this.toFFICallback(_FriendActionCallback, wrapper);
  this.storeFFICallback('FriendAction', cb);

  this.toxcore.tox_callback_friend_action(this.handle, cb, ref.NULL);
};

Tox.prototype.initNameChangeCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, namebuf, length, userdata) {
    namebuf = namebuf.slice(0, length);

    tox.emit('nameChange',
      new toxEvents.NameChangeEvent(friend, namebuf.toString()));
  };

  var cb = this.toFFICallback(_NameChangeCallback, wrapper);
  this.storeFFICallback('NameChange', cb);

  this.toxcore.tox_callback_name_change(this.handle, cb, ref.NULL);
};

Tox.prototype.initStatusMessageCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, statusbuf, length, userdata) {
    statusbuf = statusbuf.slice(0, length);

    tox.emit('statusMessage',
      new toxEvents.StatusMessageEvent(friend, statusbuf.toString()));
  };

  var cb = this.toFFICallback(_StatusMessageCallback, wrapper);
  this.storeFFICallback('StatusMessage', cb);

  this.toxcore.tox_callback_status_message(this.handle, cb, ref.NULL);
};

Tox.prototype.initUserStatusCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, status, userdata) {
    tox.emit('userStatus',
      new toxEvents.UserStatusEvent(friend, status));
  };

  var cb = this.toFFICallback(_UserStatusCallback, wrapper);
  this.storeFFICallback('UserStatus', cb);

  this.toxcore.tox_callback_user_status(this.handle, cb, ref.NULL);
};

Tox.prototype.initTypingChangeCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, typingval, userdata) {
    var typing = (typingval === 0 ? false : true);

    tox.emit('typingChange',
      new toxEvents.TypingChangeEvent(friend, typing));
  };

  var cb = this.toFFICallback(_TypingChangeCallback, wrapper);
  this.storeFFICallback('TypingChange', cb);

  this.toxcore.tox_callback_typing_change(this.handle, cb, ref.NULL);
};

Tox.prototype.initReadReceiptCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, receipt, userdata) {
    tox.emit('readReceipt',
      new toxEvents.ReadReceiptEvent(friend, receipt));
  };

  var cb = this.toFFICallback(_ReadReceiptCallback, wrapper);
  this.storeFFICallback('ReadReceipt', cb);

  this.toxcore.tox_callback_read_receipt(this.handle, cb, ref.NULL);
};

Tox.prototype.initConnectionStatusCb = function(callback) {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, statusval, userdata) {
    var status = (statusval === 0 ? 'offline' : 'online');

    tox.emit('connectionStatus',
      new toxEvents.ConnectionStatusEvent(friend, statusval));
  };

  var cb = this.toFFICallback(_ConnectionStatusCallback, wrapper);
  this.storeFFICallback('ConnectionStatus', cb);

  this.toxcore.tox_callback_connection_status(this.handle, cb, ref.NULL);
};

Tox.prototype.initAvatarInfoCb = function(callback) {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, format, hashbuffer, userdata) {
    tox.emit('avatarInfo',
      new toxEvents.AvatarInfoEvent(friend, format, hashbuffer));
  };

  var cb = this.toFFICallback(_AvatarInfoCallback, wrapper);
  this.storeFFICallback('AvatarInfo', cb);

  this.toxcore.tox_callback_avatar_info(this.handle, cb, ref.NULL);
};

Tox.prototype.initAvatarDataCb = function(callback) {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, format, hashbuffer, databuffer, datalen, userdata) {
    databuffer = databuffer.slice(0, datalen);

    tox.emit('avatarData',
      new toxEvents.AvatarDataEvent(friend, format, hashbuffer, databuffer));
  };

  var cb = this.toFFICallback(_AvatarDataCallback, wrapper);
  this.storeFFICallback('AvatarData', cb);

  this.toxcore.tox_callback_avatar_data(this.handle, cb, ref.NULL);
};

Tox.prototype.initGroupInviteCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, friend, type, databuffer, datalen, userdata) {
    databuffer = databuffer.slice(0, datalen);

    tox.emit('groupInvite',
      new toxEvents.GroupInviteEvent(friend, type, databuffer));
  };

  var cb = this.toFFICallback(_GroupInviteCallback, wrapper);
  this.storeFFICallback('GroupInvite', cb);

  this.toxcore.tox_callback_group_invite(this.handle, cb, ref.NULL);
};

Tox.prototype.initGroupMessageCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, groupnum, peernum, msgbuffer, msglen, userdata) {
    msgbuffer = msgbuffer.slice(0, msglen);

    tox.emit('groupMessage',
      new toxEvents.GroupMessageEvent(groupnum, peernum, msgbuffer.toString()));
  };

  var cb = this.toFFICallback(_GroupMessageCallback, wrapper);
  this.storeFFICallback('GroupMessage', cb);

  this.toxcore.tox_callback_group_message(this.handle, cb, ref.NULL);
};

Tox.prototype.initGroupActionCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, groupnum, peernum, actionbuffer, actionlen, userdata) {
    actionbuffer = actionbuffer.slice(0, actionlen);

    tox.emit('groupAction',
      new toxEvents.GroupActionEvent(groupnum, peernum, actionbuffer.toString()));
  };

  var cb = this.toFFICallback(_GroupActionCallback, wrapper);
  this.storeFFICallback('GroupAction', cb);

  this.toxcore.tox_callback_group_action(this.handle, cb, ref.NULL);
};

Tox.prototype.initGroupNamelistChangeCb = function() {
  this.checkHandleSync();

  var tox = this;
  var wrapper = function(handle, groupnum, peernum, change, userdata) {
    tox.emit('groupNamelistChange',
      new toxEvents.GroupNamelistChangeEvent(groupnum, peernum, change));
  };

  var cb = this.toFFICallback(_GroupNamelistChangeCallback, wrapper);
  this.storeFFICallback('GroupNamelistChange', cb);

  this.toxcore.tox_callback_group_namelist_change(this.handle, cb, ref.NULL);
};

/**
 * Synchronous tox_hash(3).
 * @param {(Buffer|String)} buf Hash function input
 * @return {Buffer}
 */
Tox.prototype.hashSync = function(buf) {
  this.checkHandleSync();

  if(_.isString(buf)) {
    buf = new Buffer(buf);
  }

  var outbuf = new Buffer(TOX_HASH_LENGTH);
  var result = this.toxcore.tox_hash(outbuf, buf, buf.length);

  if(result !== 0) return false;
  return outbuf;
};

module.exports = {
  Tox: Tox,
  Core: new Tox(), // Get rid of this later
  Consts: Consts,
  createCoreLibrary: Tox.prototype.createCoreLibrary
};
