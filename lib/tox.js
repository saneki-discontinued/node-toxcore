var buffer = require('buffer');
var events = require('events');
var fs = require('fs');
var ref = require('ref');
var ffi = require('ffi');
var path = require('path');
var RefStruct = require('ref-struct');
var RefArray = require('ref-array');

var ERRMSG_NO_HANDLE = 'Tox handle undefined';

var TOX_KEY_SIZE = 32; // Size of a tox private or public key
var TOX_FRIEND_ADDRESS_SIZE = TOX_KEY_SIZE + 6;
var TOX_MAX_NAME_LENGTH = 128;
var TOX_MAX_STATUS_MESSAGE_LENGTH = 1007;
var TOX_MAX_MESSAGE_LENGTH = 1368;
var TOX_HASH_LENGTH = 32;
var TOX_AVATAR_MAX_DATA_LENGTH = 16384;

// Better way to do this via iteration?
var Consts = {
	TOX_KEY_SIZE: TOX_KEY_SIZE,
	TOX_FRIEND_ADDRESS_SIZE: TOX_FRIEND_ADDRESS_SIZE,
	TOX_MAX_NAME_LENGTH: TOX_MAX_NAME_LENGTH,
	TOX_MAX_STATUS_MESSAGE_LENGTH: TOX_MAX_STATUS_MESSAGE_LENGTH,
	TOX_MAX_MESSAGE_LENGTH: TOX_MAX_MESSAGE_LENGTH,
	TOX_HASH_LENGTH: TOX_HASH_LENGTH,
	TOX_AVATAR_MAX_DATA_LENGTH: TOX_AVATAR_MAX_DATA_LENGTH
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
var _GroupInviteCallback   = ffi.Function('void', [ _ToxPtr, 'int32', _MaxSizeBufferPtr, 'uint16', 'pointer' ]); // Unsure of buffer length
var _GroupMessageCallback  = ffi.Function('void', [ _ToxPtr, 'int', 'int', _MessageBufferPtr, 'uint16', 'pointer' ]); // May need buffer of different size
var _GroupActionCallback   = _GroupMessageCallback; // Different size than message?
var _GroupNamelistChangeCallback = ffi.Function('void', [ _ToxPtr, 'int', 'int', 'uint8', 'pointer' ]);

var Tox = function() {
	this.toxcore = Tox.createCoreLibrary();
	this.loaded = false;
	this.emitter = new events.EventEmitter();

	// Better fix for node-ffi gc issue
	this.ffiCallbacks = {};

	this.initHandle(); // Initialize handle via tox_new
	this.initCallbacks();
}

Tox.search = function(opts) {
	if(!opts) opts = {};
	if(!opts.paths) opts.paths = [];
	if(!opts.libs) opts.libs = ['libtoxcore'];

	var map = {};

	// No paths to search, just map key => key and hope
	// ffi will find it
	if(opts.paths.length === 0) {
		for(var i = 0; i < opts.libs.length; i++) {
			map[opts.libs[i]] = opts.libs[i];
		}
	}
	else {
		for(var i = 0; i < opts.libs.length; i++) {
			var lib = opts.libs[i];
			var libpath = opts.libs[i]; // Use lib name as default "path"

			for(var j = 0; j < opts.paths.length; j++) {
				var p = opts.paths[j];
				p = path.join(p, lib + '.so');

				// If we found a .so file here, use it
				if(fs.existsSync(p) && fs.statSync(p).isFile()) {
					libpath = p;
				}
			}

			map[lib] = libpath;
		}
	}

	return map;
};

Tox.createCoreLibrary = function() {
	var libs = Tox.search({ paths: [__dirname], libs: ['libtoxcore'] });

	var ToxCoreLibrary = ffi.Library(libs['libtoxcore'], {
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

	return ToxCoreLibrary;
};
var Core = Tox.createCoreLibrary();

/**
 * Initialize the Tox.prototype object by creating
 * repetetive functions automagically.
 */
/*
Tox.initPrototype = function() {
	var names = Tox.prototype.callbackNames = [
		'FriendRequest', 'FriendMessage', 'FriendAction',
		'NameChange', 'StatusMessage', 'UserStatus',
		'TypingChange', 'ReadReceipt', 'ConnectionStatus',
		'AvatarInfo', 'AvatarData',
		'GroupInvite', 'GroupMessage', 'GroupAction', 'GroupNamelistChange'
	];

	// Create 'onCallbackName' functions
	for(var i = 0; i < names.length; i++) {
		var name = names[i];

		// Eval isn't the best solution, may be a better way?
		Tox.prototype['on' + name] = new Function("callback",
			"var name = '" + name + "';"                  +
			"var list = this.callbacks[name];"            +
			"if(!list) list = this.callbacks[name] = [];" +
			"list.push(callback);"
		);
	}
}; Tox.initPrototype();
*/

Tox.prototype.initHandle = function() {
	var optsPtr = this.defaultToxOptions().ref();
	this.handle = this.toxcore.tox_new(optsPtr);

	// Free opts?
};

Tox.prototype.initCallbacks = function() {
	this.callbacks = {};

	var names = [
		'FriendRequest', 'FriendMessage', 'FriendAction',
		'NameChange', 'StatusMessage', 'UserStatus',
		'TypingChange', 'ReadReceipt', 'ConnectionStatus',
		'AvatarInfo', 'AvatarData',
		'GroupInvite', 'GroupMessage', 'GroupAction', 'GroupNamelistChange'
	];

	// Call all our 'initCallbackNameCb' functions
	for(var i = 0; i < names.length; i++) {
		var name = names[i];
		this['init' + name + 'Cb']();
	}
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

Tox.prototype.hasHandle = function() {
	return (this.handle !== undefined);
};

Tox.prototype.countFriendListSync = function() {
	if(!this.hasHandle()) return;
	return this.toxcore.tox_count_friendlist(this.handle);
};

Tox.prototype.doSync = function() {
	if(!this.hasHandle()) return;
	this.toxcore.tox_do(this.handle);
};

Tox.prototype.getDoIntervalSync = function() {
	if(!this.hasHandle()) return;
	return this.toxcore.tox_do_interval(this.handle);
};

Tox.prototype.killSync = function() {
	if(!this.hasHandle()) return;
	this.toxcore.tox_kill(this.handle);
	this.handle = undefined;
};

Tox.prototype.load = function(filepath, callback) {
	var tox = this;

	if(!this.hasHandle()) {
		if(callback) callback(false);
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

Tox.prototype.sendMessageSync = function(message, friend) {
	if(!this.hasHandle()) return;

	// Todo: Checks (friend number, message length, etc.)

	var buffer = new Buffer(message);
	var receipt = this.toxcore.tox_send_message(this.handle, friend, buffer, buffer.length);
	return receipt;
};

Tox.prototype.hasFriendSync = function(number) {
	if(!this.hasHandle()) return;
	var ret = this.toxcore.tox_friend_exists(this.handle, number);
	return (ret === 1);
};

Tox.prototype.getFriendListSync = function() {
	if(!this.hasHandle()) return;

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

Tox.prototype.addFriendSync = function(addr, message) {
	if(!this.hasHandle()) return;

	if(addr.length !== (TOX_FRIEND_ADDRESS_SIZE * 2)) {
		return { success: false };
	}

	var addrbuf = this.fromHexString(addr);

	if(addrbuf.length !== TOX_FRIEND_ADDRESS_SIZE) {
		return { success: false };
	}

	// Todo: Message length check?

	if(message === undefined) {
		message = "";
	}

	var msgbuf = new Buffer(message);

	var success = this.toxcore.tox_add_friend(this.handle, addrbuf, msgbuf, msgbuf.length);

	if(success >= 0) {
		return { success: true, friend_number: success };
	}
	else {
		return { success: false, error_code: success };
	}
};

Tox.prototype.addFriendNoRequestSync = function(pubkeybuf) {
	if(!this.hasHandle()) return;
	var num = this.toxcore.tox_add_friend_norequest(this.handle, pubkeybuf);

	if(num > -1) {
		return { success: true, friend_number: num };
	}
	else {
		return { success: false, error_code: num };
	}
};

Tox.prototype.addGroupchatSync = function() {
	if(!this.hasHandle()) return;
	var groupnum = this.toxcore.tox_add_groupchat(this.handle);

	if(groupnum >= 0) {
		return { success: true, group_number: groupnum };
	}
	else {
		return { success: false };
	}
};

Tox.prototype.getGroupchatPeernameSync = function(groupnum, peernum) {
	if(!this.hasHandle()) return;
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

Tox.prototype.inviteSync = function(friendnum, groupnum) {
	if(!this.hasHandle()) return;
	var success = this.toxcore.tox_invite_friend(this.handle, friendnum, groupnum);
	return (success === 0);
};

Tox.prototype.joinGroupchat = function(friendnum, data) {
	if(!this.hasHandle()) return;
	var groupnum = this.toxcore.tox_join_groupchat(this.handle, friendnum, data, data.length);

	if(groupnum >= 0) {
		return { success: true, group_number: groupnum };
	}
	else {
		return { success: false };
	}
};

Tox.prototype.sendGroupchatMessageSync = function(groupnum, message) {
	if(!this.hasHandle()) return;
	var buffer = new Buffer(message);
	var success = this.toxcore.tox_group_message_send(this.handle, groupnum, buffer, buffer.length);
	return (success === 0);
};

Tox.prototype.sendGroupchatActionSync = function(groupnum, action) {
	if(!this.hasHandle()) return;
	var success = this.toxcore.tox_group_action_send(this.handle, groupnum, action, action.length);
	return (success === 0);
};

Tox.prototype.peernumberIsOurs = function(groupnum, peernum) {
	if(!this.hasHandle()) return;
	var ours = this.toxcore.tox_group_peernumber_is_ours(this.handle, groupnum, peernum);
	return (ours === 1);
};

Tox.prototype.getGroupchatPeerCountSync = function(groupnum) {
	if(!this.hasHandle()) return;
	var count = this.toxcore.tox_group_number_peers(this.handle, groupnum);

	if(count >= 0) {
		return { success: true, count: count };
	}
	else {
		return { success: false };
	}
};

Tox.prototype.getGroupchatPeerNamesSync = function(groupnum) {
	if(!this.hasHandle()) return;

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

Tox.prototype.getGroupchatCountSync = function() {
	if(!this.hasHandle()) return;
	return this.toxcore.tox_count_chatlist(this.handle);
};

Tox.prototype.getGroupchatsSync = function() {
	if(!this.hasHandle()) return;

	var count = this.getGroupchatCountSync();
	var chatsarr = new (RefArray('int32'))(count);

	var num = this.toxcore.tox_get_chatlist(this.handle, chatsarr, count);

	var chats = [];
	for(var i = 0; i < num; i++) {
		chats.push(chatsarr[i]);
	}

	return chats;
};

Tox.prototype.deleteGroupchatSync = function(groupnum) {
	if(!this.hasHandle()) return;
	var success = this.toxcore.tox_del_groupchat(this.handle, groupnum);
	return (success === 0);
};

Tox.prototype.deleteFriendSync = function(friendnum) {
	if(!this.hasHandle()) return;
	var result = this.toxcore.tox_del_friend(this.handle, friendnum);
	return (result === 0);
};

Tox.prototype.getFriendPublicKeyBufferSync = function(friendnum) {
	if(!this.hasHandle()) return;
	var buf = new Buffer(TOX_KEY_SIZE);
	var retval = this.toxcore.tox_get_client_id(this.handle, friendnum, buf);

	if(retval >= 0) return buf;
	else return;
};

Tox.prototype.getFriendPublicKeySync = function(friendnum) {
	var buf = this.getFriendPublicKeyBufferSync(friendnum);
	if(buf) return this.toHexString(buf);
	else return;
};

Tox.prototype.getNameSync = function() {
	if(!this.hasHandle()) return;

	var namebuf = new Buffer(TOX_MAX_NAME_LENGTH);
	namebuf.set(0);
	var retval = this.toxcore.tox_get_self_name(this.handle, namebuf);

	// Should return length as a positive int
	if(retval <= 0) return;

	return namebuf.toString('utf8', 0, retval);
};

Tox.prototype.getStatusMessageSync = function() {
	if(!this.hasHandle()) return;

	var statusbuf = new Buffer(TOX_MAX_STATUS_MESSAGE_LENGTH);
	statusbuf.set(0);
	var retval = this.toxcore.tox_get_self_status_message(this.handle, statusbuf, statusbuf.length);

	// Returns -1 on failure, non-negative length as int
	if(retval < 0) return;

	return statusbuf.toString('utf8', 0, retval);
};

Tox.prototype.getPublicKeyBufferSync = function() {
	if(!this.hasHandle()) return;

	var pubbuf = new Buffer(TOX_KEY_SIZE);
	this.toxcore.tox_get_keys(this.handle, pubbuf, ref.NULL);

	return pubbuf; // Returns as Buffer
};

Tox.prototype.getPublicKeySync = function() {
	var key = this.getPublicKeyBufferSync();
	if(!key) return;

	return this.toHexString(key);
};

Tox.prototype.getAddressBufferSync = function() {
	if(!this.hasHandle()) return;

	var addrbuf = new Buffer(TOX_FRIEND_ADDRESS_SIZE);
	this.toxcore.tox_get_address(this.handle, addrbuf);

	return addrbuf;
};

Tox.prototype.getAddressSync = function() {
	var addr = this.getAddressBufferSync();
	if(!addr) return;

	return this.toHexString(addr);
};

Tox.prototype.getFriendLastOnlineSync = function(friendnum) {
	if(!this.hasHandle()) return;
	return this.toxcore.tox_get_last_online(this.handle, friendnum);
};

Tox.prototype.getUserStatusSync = function() {
	if(!this.hasHandle()) return;
	return this.toxcore.tox_get_self_user_status(this.handle);
};

Tox.prototype.isNonNeg = function(n) {
	return ((typeof n) === 'number' && isFinite(n) && (n % 1) === 0 && n >= 0);
};

Tox.prototype.getFriendNameSync = function(friendnum) {
	if(!this.hasHandle()) return;

	if(!this.isNonNeg(friendnum)) return;

	var buf = new Buffer(TOX_MAX_NAME_LENGTH);
	var length = this.toxcore.tox_get_name(this.handle, friendnum, buf);

	if(length < 0) return;

	return buf.toString('utf8', 0, length);
};

Tox.prototype.getFriendStatusMessageSync = function(friendnum) {
	if(!this.hasHandle()) return;

	var buf = new Buffer(TOX_MAX_STATUS_MESSAGE_LENGTH);
	var length = this.toxcore.tox_get_status_message(this.handle, friendnum, buf, buf.length);

	if(length < 0) return;

	return buf.toString('utf8', 0, length);
};

Tox.prototype.requestAvatarDataSync = function(friendnum) {
	if(!this.hasHandle()) return;

	var result = this.toxcore.tox_request_avatar_data(this.handle, friendnum);
	return (result === 0);
};

Tox.prototype.requestAvatarInfoSync = function(friendnum) {
	if(!this.hasHandle()) return;

	var result = this.toxcore.tox_request_avatar_info(this.handle, friendnum);
	return (result === 0);
};

Tox.prototype.setAvatar = function(format, buffer, callback) {
	if(!this.hasHandle()) {
		if(callback) callback(ERRMSG_NO_HANDLE);
		return;
	}

	this.toxcore.tox_set_avatar.async(this.handle, format, buffer, buffer.length, function(err, res) {
		if(callback) {
			callback(err, res === 0);
		}
	});
};

Tox.prototype.setAvatarSync = function(format, buffer) {
	if(!this.hasHandle()) return;

	var result = this.toxcore.tox_set_avatar(this.handle, format, buffer, buffer.length);
	return (result === 0);
};

Tox.prototype.unsetAvatar = function(callback) {
	if(!this.hasHandle()) {
		if(callback) callback(ERRMSG_NO_HANDLE);
		return;
	}

	this.toxcore.tox_set_avatar.async(this.handle, function(err, res) {
		if(callback) {
			callback(err, res === 0);
		}
	});
};

Tox.prototype.unsetAvatarSync = function() {
	if(!this.hasHandle()) return;

	var result = this.toxcore.tox_unset_avatar(this.handle);
	return (result === 0);
};

Tox.prototype.setNameSync = function(name) {
	if(!this.hasHandle()) return;
	var namebuf = new Buffer(name);
	var retval = this.toxcore.tox_set_name(this.handle, namebuf, namebuf.length);
	return (retval === 0 ? true : false);
};

Tox.prototype.setStatusMessageSync = function(status) {
	if(!this.hasHandle()) return;
	var statusbuf = new Buffer(status);
	var retval = this.toxcore.tox_set_status_message(this.handle, statusbuf, statusbuf.length);
	return (retval === 0 ? true : false);
};

Tox.prototype.setUserStatusSync = function(status) {
	if(!this.hasHandle()) return;
	var retval = this.toxcore.tox_set_user_status(this.handle, status);
	return (retval === 0 ? true : false);
};

Tox.prototype.sizeSync = function() {
	if(!this.hasHandle()) return;
	return this.toxcore.tox_size(this.handle);
};

Tox.prototype.toHexString = function(buf) {
	var hex = new Buffer(buf.length * 2);

	for(var i = 0; i < buf.length; i++) {
		var b = buf[i].toString(16);
		if(b.length == 1) b = '0' + b;

		hex.write(b.toUpperCase(), i*2);
	}

	return hex.toString();
};

Tox.prototype.fromHexString = function(str) {
	var len = str.length;
	if(len % 2 != 0) len--; // Ignore last char

	var buffer = new Buffer(len / 2);
	for(var i = 0; i < buffer.length; i++) {
		var s = str[i*2] + str[(i*2)+1];
		buffer[i] = parseInt(s, 16);
	}

	return buffer;
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
 * Fire our toxcore events. This should only be called
 * by the wrapper functions bound using toxcore's callback
 * functions.
 *
 * @param name Event name
 * @param data Map of data related to callback
 */
/*
Tox.prototype.fire = function(name, data) {
	var list = this.callbacks[name];
	if(list) {
		for(var i = 0; i < list.length; i++) {
			if(list[i]) list[i](data);
		}
	}
};
*/

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
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, pubkeybuffer, data, length, userdata) {
		pubkeybuffer = pubkeybuffer.slice(0, TOX_KEY_SIZE);
		data = data.slice(0, length);

		tox.emit('friendRequest', {
			public_key_buffer: pubkeybuffer,
			public_key: tox.toHexString(pubkeybuffer),
			data: data,
			userdata: userdata
		});
	};

	var cb = this.toFFICallback(_FriendRequestCallback, wrapper);
	this.storeFFICallback('FriendRequest', cb);

	this.toxcore.tox_callback_friend_request(this.handle, cb, ref.NULL);
};

Tox.prototype.initFriendMessageCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, msgbuf, length, userdata) {
		msgbuf = msgbuf.slice(0, length);

		tox.emit('friendMessage', {
			friend_number: friend, // Friend number
			message: msgbuf.toString() // Message
		});
	};

	var cb = this.toFFICallback(_FriendMessageCallback, wrapper);
	this.storeFFICallback('FriendMessage', cb);

	this.toxcore.tox_callback_friend_message(this.handle, cb, ref.NULL);
};

Tox.prototype.initFriendActionCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, actionbuf, length, userdata) {
		actionbuf = actionbuf.slice(0, length);

		tox.emit('friendAction', {
			friend_number: friend,
			action: actionbuf.toString()
		});
	};

	var cb = this.toFFICallback(_FriendActionCallback, wrapper);
	this.storeFFICallback('FriendAction', cb);

	this.toxcore.tox_callback_friend_action(this.handle, cb, ref.NULL);
};

Tox.prototype.initNameChangeCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, namebuf, length, userdata) {
		namebuf = namebuf.slice(0, length);

		tox.emit('nameChange', {
			friend_number: friend,
			name: namebuf.toString()
		});
	};

	var cb = this.toFFICallback(_NameChangeCallback, wrapper);
	this.storeFFICallback('NameChange', cb);

	this.toxcore.tox_callback_name_change(this.handle, cb, ref.NULL);
};

Tox.prototype.initStatusMessageCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, statusbuf, length, userdata) {
		statusbuf = statusbuf.slice(0, length);

		tox.emit('statusMessage', {
			friend_number: friend,
			status: statusbuf.toString()
		});
	};

	var cb = this.toFFICallback(_StatusMessageCallback, wrapper);
	this.storeFFICallback('StatusMessage', cb);

	this.toxcore.tox_callback_status_message(this.handle, cb, ref.NULL);
};

Tox.prototype.initUserStatusCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, status, userdata) {
		tox.emit('userStatus', {
			friend_number: friend,
			status: status
		});
	};

	var cb = this.toFFICallback(_UserStatusCallback, wrapper);
	this.storeFFICallback('UserStatus', cb);

	this.toxcore.tox_callback_user_status(this.handle, cb, ref.NULL);
};

Tox.prototype.initTypingChangeCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, typingval, userdata) {
		var typing = (typingval === 0 ? false : true);

		tox.emit('typingChange', {
			friend_number: friend,
			typing: typing
		});
	};

	var cb = this.toFFICallback(_TypingChangeCallback, wrapper);
	this.storeFFICallback('TypingChange', cb);

	this.toxcore.tox_callback_typing_change(this.handle, cb, ref.NULL);
};

Tox.prototype.initReadReceiptCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, receipt, userdata) {
		tox.emit('readReceipt', {
			friend_number: friend,
			receipt: receipt
		});
	};

	var cb = this.toFFICallback(_ReadReceiptCallback, wrapper);
	this.storeFFICallback('ReadReceipt', cb);

	this.toxcore.tox_callback_read_receipt(this.handle, cb, ref.NULL);
};

Tox.prototype.initConnectionStatusCb = function(callback) {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, statusval, userdata) {
		var status = (statusval === 0 ? 'offline' : 'online');

		tox.emit('connectionStatus', {
			friend_number: friend,
			status: status,
			status_value: statusval
		});
	};

	var cb = this.toFFICallback(_ConnectionStatusCallback, wrapper);
	this.storeFFICallback('ConnectionStatus', cb);

	this.toxcore.tox_callback_connection_status(this.handle, cb, ref.NULL);
};

Tox.prototype.initAvatarInfoCb = function(callback) {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, format, hashbuffer, userdata) {
		tox.emit('avatarInfo', {
			friend_number: friend,
			format: format,
			hash_buffer: hashbuffer
		});
	};

	var cb = this.toFFICallback(_AvatarInfoCallback, wrapper);
	this.storeFFICallback('AvatarInfo', cb);

	this.toxcore.tox_callback_avatar_info(this.handle, cb, ref.NULL);
};

Tox.prototype.initAvatarDataCb = function(callback) {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, format, hashbuffer, databuffer, datalen, userdata) {
		databuffer = databuffer.slice(0, datalen);

		tox.emit('avatarData', {
			friend_number: friend,
			format: format,
			hash_buffer: hashbuffer,
			data_buffer: databuffer
		});
	};

	var cb = this.toFFICallback(_AvatarDataCallback, wrapper);
	this.storeFFICallback('AvatarData', cb);

	this.toxcore.tox_callback_avatar_data(this.handle, cb, ref.NULL);
};

Tox.prototype.initGroupInviteCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, friend, databuffer, datalen, userdata) {
		databuffer = databuffer.slice(0, datalen);

		tox.emit('groupInvite', {
			friend_number: friend,
			data_buffer: databuffer
		});
	};

	var cb = this.toFFICallback(_GroupInviteCallback, wrapper);
	this.storeFFICallback('GroupInvite', cb);

	this.toxcore.tox_callback_group_invite(this.handle, cb, ref.NULL);
};

Tox.prototype.initGroupMessageCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, groupnum, peernum, msgbuffer, msglen, userdata) {
		msgbuffer = msgbuffer.slice(0, msglen);

		tox.emit('groupMessage', {
			group_number: groupnum,
			peer_number: peernum,
			message: msgbuffer.toString()
		});
	};

	var cb = this.toFFICallback(_GroupMessageCallback, wrapper);
	this.storeFFICallback('GroupMessage', cb);

	this.toxcore.tox_callback_group_message(this.handle, cb, ref.NULL);
};

Tox.prototype.initGroupActionCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, groupnum, peernum, actionbuffer, actionlen, userdata) {
		actionbuffer = actionbuffer.slice(0, actionlen);

		tox.emit('groupAction', {
			group_number: groupnum,
			peer_number: peernum,
			action: actionbuffer.toString()
		});
	};

	var cb = this.toFFICallback(_GroupActionCallback, wrapper);
	this.storeFFICallback('GroupAction', cb);

	this.toxcore.tox_callback_group_action(this.handle, cb, ref.NULL);
};

Tox.prototype.initGroupNamelistChangeCb = function() {
	if(!this.hasHandle()) return;

	var tox = this;
	var wrapper = function(handle, groupnum, peernum, change, userdata) {
		tox.emit('groupNamelistChange', {
			group_number: groupnum,
			peer_number: peernum,
			change: change
		});
	};

	var cb = this.toFFICallback(_GroupNamelistChangeCallback, wrapper);
	this.storeFFICallback('GroupNamelistChange', cb);

	this.toxcore.tox_callback_group_namelist_change(this.handle, cb, ref.NULL);
};

Tox.hash = function(buf) {
	var outbuf = new Buffer(TOX_HASH_LENGTH);
	var result = Core.tox_hash(outbuf, buf, buf.length);

	if(result !== 0) return false;
	return outbuf;
};

module.exports = {
	Tox: Tox,
	Core: Core,
	Consts: Consts
};
