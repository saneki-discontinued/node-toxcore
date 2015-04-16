/**
 * @file toxold.js - Old groupchat functions (tox_old.h)
 * @todo Test everything
 */

var buffertools = require('buffertools');
var events = require('events');
var fs = require('fs');
var ref = require('ref');
var RefArray = require('ref-array');
var ffi = require('ffi');
var path = require('path');
var _ = require('underscore');

buffertools.extend();

// For errors/events, just use files in parent directory for now.
// @todo Copy/change path when those files are gone
var consts = require(path.join(__dirname, 'consts'));
var errors = require(path.join(__dirname, '..', 'errors'));
var toxEvents = require(path.join(__dirname, '..', 'events'));
var util = require(path.join(__dirname, 'util'));

// Tox constants
var TOX_KEY_SIZE = consts.TOX_KEY_SIZE;
var TOX_MAX_NAME_LENGTH = consts.TOX_MAX_NAME_LENGTH;

// Error functions
var createInvalidToxAddressError = errors.createInvalidToxAddressError;
var createNegativeReturnError = errors.createNegativeReturnError;
var createNonOneReturnError = errors.createNonOneReturnError;
var createNonPositiveReturnError = errors.createNonPositiveReturnError;
var createNonZeroReturnError = errors.createNonZeroReturnError;
var createReturnError = errors.createReturnError;

// Tox types
var ToxPtr = ref.refType(ref.types.void);

// Common types
var UInt8Ptr = ref.refType('uint8');
var UInt16Ptr = ref.refType('uint16');
var Int32Ptr = ref.refType('int32');
var UserData = 'pointer';

// Buffer sizes for callbacks
// I don't believe these consts have changed since tox_old..
var MessageBuffer = RefArray('uint8', consts.TOX_MAX_MESSAGE_LENGTH);
var MessageBufferPtr = ref.refType(MessageBuffer);
var NameBuffer = RefArray('uint8', consts.TOX_MAX_NAME_LENGTH);
var NameBufferPtr = ref.refType(NameBuffer);
var MaxSizeBuffer = RefArray('uint8', 0xFFFF);
var MaxSizeBufferPtr = ref.refType(MaxSizeBuffer);

// Tox callback types
var GroupInviteCallback   = ffi.Function('void', [ ToxPtr, 'int32', 'uint8', MaxSizeBufferPtr, 'uint16', UserData ]); // Unsure of buffer length
var GroupMessageCallback  = ffi.Function('void', [ ToxPtr, 'int', 'int', MessageBufferPtr, 'uint16', UserData ]);
var GroupActionCallback   = GroupMessageCallback;
var GroupNamelistChangeCallback = ffi.Function('void', [ ToxPtr, 'int', 'int', 'uint8', UserData ]);
var GroupTitleCallback    = ffi.Function('void', [ ToxPtr, 'int', 'int', NameBufferPtr, 'uint8', UserData ]);

/**
 * Construct a new ToxOld for using old groupchat functions.
 * @class
 * @param {String} opts.path - Path to libtoxcore
 * @param {Tox}    opts.tox  - Parent Tox instance
 * @todo Accept either tox option, options array, or both?
 */
var ToxOld = function(opts) {
  this._emitter = new events.EventEmitter();
  this._libpath = opts.path;
  this._tox = opts.tox;
  this._library = this.createLibrary(this._libpath);
  this._initCallbacks();
};

/**
 * Create a libtoxcore Library instance specifically for old
 * groupchat functions.
 * @param {String} [libpath='libtoxcore'] - Path to libtoxcore
 * @return {ffi.Library}
 */
ToxOld.prototype.createLibrary = function(libpath) {
  libpath = libpath || 'libtoxcore';
  return ffi.Library(libpath, {
    'tox_add_groupchat':          [ 'int',  [ ToxPtr ] ],
    'tox_callback_group_invite':  [ 'void', [ ToxPtr, GroupInviteCallback, UserData ] ],
    'tox_callback_group_message': [ 'void', [ ToxPtr, GroupMessageCallback, UserData ] ],
    'tox_callback_group_action':  [ 'void', [ ToxPtr, GroupActionCallback, UserData ] ],
    'tox_callback_group_namelist_change': [ 'void', [ ToxPtr, GroupNamelistChangeCallback, UserData ] ],
    'tox_callback_group_title': [ 'void', [ ToxPtr, GroupTitleCallback, UserData ] ],
    'tox_count_chatlist':     [ 'uint32', [ ToxPtr ] ],
    'tox_del_groupchat':      [ 'int',    [ ToxPtr, 'int' ] ],
    'tox_get_chatlist':       [ 'uint32', [ ToxPtr, Int32Ptr, 'uint32' ] ],
    'tox_group_action_send':  [ 'int',    [ ToxPtr, 'int', UInt8Ptr, 'uint16' ] ],
    'tox_group_get_names':    [ 'int',    [ ToxPtr, 'int', UInt8Ptr, UInt16Ptr, 'uint16' ] ],
    'tox_group_get_title':    [ 'int',    [ ToxPtr, 'int', UInt8Ptr, 'uint32' ] ],
    'tox_group_message_send': [ 'int',    [ ToxPtr, 'int', UInt8Ptr, 'uint16' ] ],
    'tox_group_number_peers': [ 'int',    [ ToxPtr, 'int' ] ],
    'tox_group_peername':     [ 'int',    [ ToxPtr, 'int', 'int', UInt8Ptr ] ],
    'tox_group_peernumber_is_ours': [ 'uint', [ ToxPtr, 'int', 'int' ] ],
    'tox_group_peer_pubkey':  [ 'int',    [ ToxPtr, 'int', 'int', UInt8Ptr] ],
    'tox_group_set_title':    [ 'int',    [ ToxPtr, 'int', UInt8Ptr, 'uint8' ] ],
    'tox_invite_friend':      [ 'int',    [ ToxPtr, 'int32', 'int' ] ],
    'tox_join_groupchat':     [ 'int',    [ ToxPtr, 'int32', UInt8Ptr, 'uint16' ] ]
  });
};


///////////////////////////////////////
//> Wrapper methods for tox.h functions
///////////////////////////////////////


/**
 * Asynchronous tox_add_groupchat(3).
 */
ToxOld.prototype.addGroupchat = function(callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_add_groupchat.async(this.getHandle(), function(err, res) {
    if(!err && res < 0) {
      err = createNegativeReturnError('tox_add_groupchat', res);
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_add_groupchat(3).
 * @return {Number} Groupchat number
 * @throws Error if tox_add_groupchat returns a negative value
 */
ToxOld.prototype.addGroupchatSync = function() {
  this._checkHandleSync();

  var groupnum = this.getLibrary().tox_add_groupchat(this.getHandle());
  if(groupnum < 0) {
    throw createNegativeReturnError('tox_add_groupchat', groupnum);
  }

  return groupnum;
};

/**
 * Asynchronous tox_del_groupchat(3).
 * @param {Number} groupnum
 */
ToxOld.prototype.deleteGroupchat = function(groupnum, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_del_groupchat.async(this.getHandle(), groupnum, function(err, res) {
    if(!err && res !== 0) {
      err = createNonZeroReturnError('tox_del_groupchat', res);
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_del_groupchat(3).
 * @param {Number} groupnum
 * @throws Error if tox_del_groupchat returns a non-zero value
 */
ToxOld.prototype.deleteGroupchatSync = function(groupnum) {
  this._checkHandleSync();
  var res = this.getLibrary().tox_del_groupchat(this.getHandle(), groupnum);
  if(res !== 0) {
    throw createNonZeroReturnError('tox_del_groupchat', res);
  }
};

/**
 * Asynchronous tox_group_peername(3).
 * @param {Number} groupnum
 * @param {Number} peernum
 */
ToxOld.prototype.getGroupchatPeername = function(groupnum, peernum, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var namebuf = new Buffer(TOX_MAX_NAME_LENGTH);
  this.getLibrary().tox_group_peername.async(this.getHandle(), groupnum, peernum, namebuf, function(err, res) {
    var name;

    if(!err && res < 0) {
      err = createNegativeReturnError('tox_group_peername', res);
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
 * @return {String} Name of specified peer
 * @throws Error if tox_group_peername returns a negative value
 */
ToxOld.prototype.getGroupchatPeernameSync = function(groupnum, peernum) {
  this._checkHandleSync();

  var namebuf = new Buffer(TOX_MAX_NAME_LENGTH);

  var len = this.getLibrary().tox_group_peername(this.getHandle(), groupnum, peernum, namebuf);
  if(len < 0) {
    throw createNegativeReturnError('tox_group_peername', len);
  }

  return namebuf.slice(0, len).toString();
};

/**
 * Asynchronous to tox_group_peer_pubkey(3)
 * @param {Number} groupnum
 * @param {Number} peernum
 * @throws Error if tox_group_peer_pubkey returns a negative value
 */
ToxOld.prototype.getGroupchatPeerPublicKey = function(groupnum, peernum, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var keybuf = new Buffer(TOX_KEY_SIZE);

  this.getLibrary().tox_group_peer_pubkey.async(this.getHandle(), groupnum, peernum, keybuf, function(err, res) {
    if(!err && res < 0) {
      err = createNegativeReturnError('tox_group_peer_pubkey', res);
    }

    if(callback) {
      callback(err, keybuf);
    }
  });
};

/**
 * Synchronous to tox_group_peer_pubkey(3)
 * @param {Number} groupnum
 * @param {Number} peernum
 * @return {Buffer} Public key of specified peer
 * @throws Error if tox_group_peer_pubkey returns a negative value
 */
ToxOld.prototype.getGroupchatPeerPublicKeySync = function(groupnum, peernum) {
  this._checkHandleSync();

  var keybuf = new Buffer(TOX_KEY_SIZE);
  var ret = this.getLibrary().tox_group_peer_pubkey(this.getHandle(), groupnum, peernum, keybuf);
  if(ret < 0) {
    throw createNegativeReturnError('tox_group_peer_pubkey', ret);
  }

  return keybuf;
};

/**
 * Asynchronous to tox_group_peer_pubkey(3) (Hex string version)
 * @param {Number} groupnum
 * @param {Number} peernum
 * @throws Error if tox_group_peer_pubkey returns a negative value
 */
ToxOld.prototype.getGroupchatPeerPublicKeyHex = function(groupnum, peernum, callback) {
  util.hexify(this.getGroupchatPeerPublicKey.bind(this, groupnum, peernum), callback);
};

/**
 * Synchronous to tox_group_peer_pubkey(3) (Hex string version)
 * @param {Number} groupnum
 * @param {Number} peernum
 * @return {String} Public key of specified peer
 * @throws Error if tox_group_peer_pubkey returns a negative value
 */
ToxOld.prototype.getGroupchatPeerPublicKeyHexSync = function(groupnum, peernum) {
  return util.hexifySync(this.getGroupchatPeerPublicKeySync.bind(this, groupnum, peernum));
};

/**
 * Asynchronous tox_invite_friend(3).
 * @param {Number} friendnum
 * @param {Number} groupnum
 */
ToxOld.prototype.invite = function(friendnum, groupnum, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_invite_friend.async(this.getHandle(), friendnum, groupnum, function(err, res) {
    if(!err && res !== 0) {
      err = createNonZeroReturnError('tox_invite_friend', res);
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_invite_friend(3).
 * @param {Number} friendnum
 * @param {Number} groupnum
 * @throws Error if tox_invite_friend returns a non-zero value
 */
ToxOld.prototype.inviteSync = function(friendnum, groupnum) {
  this._checkHandleSync();
  var res = this.getLibrary().tox_invite_friend(this.getHandle(), friendnum, groupnum);
  if(res !== 0) {
    throw createNonZeroReturnError('tox_invite_friend', res);
  }
};

/**
 * Asynchronous tox_join_groupchat(3).
 * @param {Number} friendnum
 * @param {Buffer} data
 */
ToxOld.prototype.joinGroupchat = function(friendnum, data, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_join_groupchat.async(this.getHandle(), friendnum, data, data.length, function(err, res) {
    if(!err && res < 0) {
      err = createNegativeReturnError('tox_join_groupchat', res);
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_join_groupchat(3).
 * @param {Number} friendnum
 * @param {Buffer} data
 * @return {Number} Groupchat number
 * @throws Error if tox_join_groupchat returns a negative value
 */
ToxOld.prototype.joinGroupchatSync = function(friendnum, data) {
  this._checkHandleSync();

  var groupnum = this.getLibrary().tox_join_groupchat(this.getHandle(), friendnum, data, data.length);

  if(groupnum < 0) {
    throw createNegativeReturnError('tox_join_groupchat', groupnum);
  }

  return groupnum;
};

/**
 * Asynchronous tox_group_message_send(3).
 * @param {Number} groupnum
 * @param {String} message
 */
ToxOld.prototype.sendGroupchatMessage = function(groupnum, message, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var buffer = new Buffer(message);
  this.getLibrary().tox_group_message_send.async(this.getHandle(), groupnum, buffer, buffer.length, function(err, res) {
    if(!err && res !== 0) {
      err = createNonZeroReturnError('tox_group_message_send', res);
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
 * @throws Error if tox_group_message_send returns a non-zero value
 */
ToxOld.prototype.sendGroupchatMessageSync = function(groupnum, message) {
  this._checkHandleSync();
  var buffer = new Buffer(message);
  var result = this.getLibrary().tox_group_message_send(this.getHandle(), groupnum, buffer, buffer.length);
  if(result !== 0) {
    throw createNonZeroReturnError('tox_group_message_send', result);
  }
};

/**
 * Asynchronous tox_group_action_send(3).
 * @param {Number} groupnum
 * @param {String} action
 */
ToxOld.prototype.sendGroupchatAction = function(groupnum, action, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var buffer = new Buffer(action);
  this.getLibrary().tox_group_action_send(this.getHandle(), groupnum, buffer, buffer.length, function(err, res) {
    if(!err && res !== 0) {
      err = createNonZeroReturnError('tox_group_action_send', res);
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
 * @throws Error if tox_group_action_send returns a non-zero value
 */
ToxOld.prototype.sendGroupchatActionSync = function(groupnum, action) {
  this._checkHandleSync();
  var result = this.getLibrary().tox_group_action_send(this.getHandle(), groupnum, action, action.length);
  if(result !== 0) {
    throw createNonZeroReturnError('tox_group_action_send', result);
  }
};

/**
 * Asynchronous tox_group_set_title(3).
 * @param {Number} groupnum Group number
 * @param {String} title Title to set
 */
ToxOld.prototype.setGroupchatTitle = function(groupnum, title, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var titleBuffer = new Buffer(title);
  this.getLibrary().tox_group_set_title.async(this.getHandle(), groupnum, titleBuffer, title.length, function(err, res) {
    if(!err && res !== 0) {
      err = createNonZeroReturnError('tox_group_set_title', res);
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_group_set_title(3).
 * @param {Number} groupnum Group number
 * @param {String} title Title to set
 * @throws Error if tox_group_set_title returns a non-zero value
 */
ToxOld.prototype.setGroupchatTitleSync = function(groupnum, title) {
  this._checkHandleSync();

  var titleBuffer = new Buffer(title);
  var res = this.getLibrary().tox_group_set_title(this.getHandle(), groupnum, titleBuffer, title.length);

  if(res !== 0) {
    throw createNonZeroReturnError('tox_group_set_title', res);
  }
};

/**
 * Asynchronous tox_group_get_title(3).
 * @param {Number} groupnum Group number
 */
ToxOld.prototype.getGroupchatTitle = function(groupnum, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var buffer = new Buffer(TOX_MAX_NAME_LENGTH);
  this.getLibrary().tox_group_get_title.async(this.getHandle(), groupnum, buffer, buffer.length, function(err, res) {
    if(!err && res < 0) {
      err = createNegativeReturnError('tox_group_get_title', res);
    }

    var title;
    if(!err) {
      title = buffer.toString('utf8', 0, res);
    }

    if(callback) {
      callback(err, title);
    }
  });
};

/**
 * Synchronous tox_group_get_title(3).
 * @param {Number} groupnum Group number
 * @return {String} title
 * @throws Error if tox_group_get_title returns a negative value
 */
ToxOld.prototype.getGroupchatTitleSync = function(groupnum) {
  this._checkHandleSync();

  var buffer = new Buffer(TOX_MAX_NAME_LENGTH);
  var length = this.getLibrary().tox_group_get_title(this.getHandle(), groupnum, buffer, buffer.length);

  if(length < 0) {
    throw createNegativeReturnError('tox_group_get_title', length);
  }

  return buffer.toString('utf8', 0, length);
};

/**
 * Asynchronous tox_group_peernumber_is_ours(3).
 * @param {Number} groupnum
 * @param {Number} peernum
 */
ToxOld.prototype.peernumberIsOurs = function(groupnum, peernum, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_group_peernumber_is_ours.async(this.getHandle(), groupnum, peernum, function(err, res) {
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
ToxOld.prototype.peernumberIsOursSync = function(groupnum, peernum) {
  this._checkHandleSync();
  var ours = this.getLibrary().tox_group_peernumber_is_ours(this.getHandle(), groupnum, peernum);
  return (ours === 1);
};

/**
 * Asynchronous tox_group_number_peers(3).
 * @param {Number} groupnum
 */
ToxOld.prototype.getGroupchatPeerCount = function(groupnum, callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_group_number_peers.async(this.getHandle(), groupnum, function(err, res) {
    if(!err && res < 0) {
      err = createNegativeReturnError('tox_group_number_peers', res);
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous tox_group_number_peers(3).
 * @param {Number} groupnum
 * @return {Number} Groupchat peer count
 * @throws Error if tox_group_number_peers returns a negative value
 */
ToxOld.prototype.getGroupchatPeerCountSync = function(groupnum) {
  this._checkHandleSync();
  var count = this.getLibrary().tox_group_number_peers(this.getHandle(), groupnum);

  if(count < 0) {
    throw createNegativeReturnError('tox_group_number_peers', count);
  }

  return count;
};

/**
 * Asynchronous tox_group_get_names(3).
 * @param {Number} groupnum
 */
ToxOld.prototype.getGroupchatPeerNames = function(groupnum, callback) {
  if(!this._checkHandle(callback)) {
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

      tox.getLibrary().tox_group_get_names.async(
        tox.handle, groupnum, namesarr, lengthsarr.buffer, count,
        function(err, res) {
          if(!err && res < 0) {
            err = createNegativeReturnError('tox_group_get_names', res);
          }

          var names;
          if(!err) {
            names = [];
            for(var i = 0; i < res; i++) {
              var start = (TOX_MAX_NAME_LENGTH * i),
                  len = lengthsarr[i],
                  end = (start + len);

              namebuf = namesarr.slice(start, end);

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
 * @return {String[]} Array of names
 * @throws Error if getGroupchatPeerCountSync throws an error
 * @throws Error if tox_group_get_names returns a negative value
 */
ToxOld.prototype.getGroupchatPeerNamesSync = function(groupnum) {
  this._checkHandleSync();

  // Get count
  var count = this.getGroupchatPeerCountSync(groupnum);

  if(count === 0) {
    return [];
  }

  var namesarr = new Buffer(TOX_MAX_NAME_LENGTH * count);
  namesarr.fill(0);
  var lengthsarr = new (RefArray('uint16'))(count);

  var peers = this.getLibrary().tox_group_get_names(this.getHandle(), groupnum, namesarr, lengthsarr.buffer, count);

  if(peers < 0) {
    throw createNegativeReturnError('tox_group_get_names', peers);
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

  return names;
};

/**
 * Asynchronous tox_count_chatlist(3).
 */
ToxOld.prototype.getGroupchatCount = function(callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_count_chatlist.async(this.getHandle(), callback);
};

/**
 * Synchronous tox_count_chatlist(3).
 */
ToxOld.prototype.getGroupchatCountSync = function() {
  this._checkHandleSync();
  return this.getLibrary().tox_count_chatlist(this.getHandle());
};

/**
 * Asynchronous tox_get_chatlist(3).
 */
ToxOld.prototype.getGroupchats = function(callback) {
  if(!this._checkHandle(callback)) {
    return;
  }

  var tox = this;
  this.getGroupchatCount(function(err, res) {
    if(!err) {
      var chatsarr = new (RefArray('int32'))(count);
      tox.getLibrary().tox_get_chatlist.async(tox.handle, chatsarr, res, function(err, res) {
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
 * @return {Number[]} Groupchat ids
 */
ToxOld.prototype.getGroupchatsSync = function() {
  this._checkHandleSync();

  var count = this.getGroupchatCountSync();
  var chatsarr = new (RefArray('int32'))(count);

  var num = this.getLibrary().tox_get_chatlist(this.getHandle(), chatsarr, count);

  var chats = [];
  for(var i = 0; i < num; i++) {
    chats.push(chatsarr[i]);
  }

  return chats;
};


/////////////////////////////
//> Other convenience methods
/////////////////////////////


/**
 * Get the parent Tox instance.
 * @return {Tox} Tox instance
 */
ToxOld.prototype.tox = function() {
  return this._tox;
};

/**
 * Get the internal Library instance.
 * @return {ffi.Library}
 */
ToxOld.prototype.getLibrary = function() {
  return this._library;
};

/**
 * Get the Tox handle object (pointer).
 * @return {Object} Tox handle object
 */
ToxOld.prototype.getHandle = function() {
  return this.tox().getHandle();
};

/**
 * Whether or not this Tox instance has a handle.
 * @return {Boolean} true if handle, false if none
 */
ToxOld.prototype.hasHandle = function() {
  return !!this.getHandle();
};


//////////////////////////
//> Private helper methods
//////////////////////////


/**
 * Check if this Tox instance has a handle associated with it.
 * @priv
 * @copied from tox.js
 * @param {Tox~errorCallback} callback - Callback to pass Error object to if no handle
 * @return {Boolean} true if has handle (no error), false if no handle (error)
 */
ToxOld.prototype._checkHandle = function(callback) {
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
 * @copied from tox.js
 * @throws Error if no handle
 */
ToxOld.prototype._checkHandleSync = function() {
  if(!this.hasHandle()) {
    var err = new Error('No toxcore handle');
    err.code = 'NO_HANDLE';
    throw err;
  }
};

/**
 * Wrapper method for _emitter.emit.
 * @priv
 * @copied from tox.js
 */
ToxOld.prototype._emit = function() {
  this._emitter.emit.apply(this._emitter, arguments);
};

/**
 * Wrapper method for _emitter.removeListener.
 * @copied from tox.js
 */
ToxOld.prototype.off = function() {
  this._emitter.removeListener.apply(this._emitter, arguments);
};

/**
 * Wrapper method for _emitter.on.
 * @copied from tox.js
 */
ToxOld.prototype.on = function() {
  this._emitter.on.apply(this._emitter, arguments);
};

/**
 * Store an ffi.Callback. This is to prevent an annoying ffi garbage collection bug.
 * @priv
 * @copied from tox.js
 * @param {Object} key - Key
 * @param {ffi.Callback} callback - Callback
 */
ToxOld.prototype._storeFFICallback = function(key, callback) {
  if(!this._ffiCallbacks)
    this._ffiCallbacks = {};

  if(this._ffiCallbacks[key] === undefined)
    this._ffiCallbacks[key] = [ callback ];
  else this._ffiCallbacks[key].push(callback);
};

/**
 * Helper for node-ffi's Function to Callback.
 * @priv
 * @copied from tox.js
 * @param {ffi.Function} ffiFunc - Function definition
 * @param {Function} callback - Callback function
 * @return {ffi.Callback} ffi callback
 */
ToxOld.prototype._toFFICallback = function(ffiFunc, callback) {
  return ffi.Callback(ffiFunc.retType, ffiFunc.argTypes, callback);
};


///////////////////////
//> Events initializers
///////////////////////


/**
 * Initialize all callbacks.
 * @priv
 */
ToxOld.prototype._initCallbacks = function() {
  this._initGroupInviteCb();
  this._initGroupMessageCb();
  this._initGroupActionCb();
  this._initGroupNamelistChangeCb();
  this._initGroupTitleCb();
};

/**
 * Helper function for initializing tox callbacks.
 * @priv
 */
ToxOld.prototype._initCallback = function(opts) {
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
 * Initialize the groupInvite event callback.
 * @priv
 */
ToxOld.prototype._initGroupInviteCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_group_invite.bind(undefined, this.getHandle()),
    cb: GroupInviteCallback,
    name: 'GroupInvite',
    wrapper: function(handle, friend, type, data, length, userdata) {
      data = data.slice(0, length);
      _this._emit('groupInvite', new toxEvents.GroupInviteEvent(friend, type, data));
    }
  });
};

/**
 * Initialize the groupMessage event callback.
 * @priv
 */
ToxOld.prototype._initGroupMessageCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_group_message.bind(undefined, this.getHandle()),
    cb: GroupMessageCallback,
    name: 'GroupMessage',
    wrapper: function(handle, groupnum, peernum, message, length, userdata) {
      message = message.toString('utf8', 0, length);
      _this._emit('groupMessage', new toxEvents.GroupMessageEvent(groupnum, peernum, message));
    }
  });
};

/**
 * Initialize the groupAction event callback.
 * @priv
 */
ToxOld.prototype._initGroupActionCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_group_action.bind(undefined, this.getHandle()),
    cb: GroupActionCallback,
    name: 'GroupAction',
    wrapper: function(handle, groupnum, peernum, action, length, userdata) {
      action = action.toString('utf8', 0, length);
      _this._emit('groupAction', new toxEvents.GroupActionEvent(groupnum, peernum, action));
    }
  });
};

/**
 * Initialize the groupNamelistChange event callback.
 * @priv
 */
ToxOld.prototype._initGroupNamelistChangeCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_group_namelist_change.bind(undefined, this.getHandle()),
    cb: GroupNamelistChangeCallback,
    name: 'GroupNamelistChange',
    wrapper: function(handle, groupnum, peernum, change, userdata) {
      _this._emit('groupNamelistChange', new toxEvents.GroupNamelistChangeEvent(groupnum, peernum, change));
    }
  });
};

/**
 * Initialize the groupTitle event callback.
 * @priv
 */
ToxOld.prototype._initGroupTitleCb = function() {
  var _this = this;
  this._initCallback({
    api: this.getLibrary().tox_callback_group_title.bind(undefined, this.getHandle()),
    cb: GroupTitleCallback,
    name: 'GroupTitle',
    wrapper: function(handle, groupnum, peernum, title, length, userdata) {
      title = title.toString('utf8', 0, length);
      _this._emit('groupTitle', new toxEvents.GroupTitleEvent(groupnum, peernum, title));
    }
  });
};

module.exports = ToxOld;
