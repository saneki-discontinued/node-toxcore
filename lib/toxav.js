var ffi = require('ffi');
var path = require('path');
var ref = require('ref');
var errors = require(path.join(__dirname, 'errors'));

var _UInt8Ptr = ref.refType('uint8');
var _Tox = ref.types.void;
var _ToxPtr = ref.refType(_Tox);
var _ToxAV = ref.types.void;
var _ToxAVPtr = ref.refType(_ToxAV);

// Uhhh.. *pcm may cause issues?
var _AVGroupCallback = ffi.Function('void', [ _ToxPtr, 'int', 'int', 'pointer', 'uint', 'uint8', 'uint', 'pointer' ]);

var createNegativeReturnError = errors.createNegativeReturnError;
var createToxNoHandleError = errors.createToxNoHandleError;

/**
 * Construct a new ToxAV.
 * @class
 * @param {Tox} tox       - Tox instance
 * @param {Object} [opts] - Options
 * @param {String} [opts.path] toxav library path, will use the
 *                 default if not specified
 */
var ToxAV = function(tox, opts) {
  if(!opts) opts = {};
  var libpath = opts['path'];

  this._tox = tox;
  this._toxav = this.createLibrary(libpath);
};

/**
 * Check if _tox exists and has a handle.
 * @param [callback] - Callback to pass Error object to if _tox or
 *                     its handle is missing
 * @return true if _tox exists and has handle, false if not
 */
ToxAV.prototype._checkToxHandle = function(callback) {
  if(!this._tox || !this._tox.hasHandle()) {
    if(callback) {
      callback(createToxNoHandleError());
    }
    return false;
  }
  return true;
};

/**
 * Check if _tox exists and has a handle.
 * @throws Error if no _tox or no handle.
 */
ToxAV.prototype._checkToxHandleSync = function() {
  if(!this._tox || !this._tox.hasHandle()) {
    throw createToxNoHandleError();
  }
};

/**
 * Get the Tox object.
 * @return {Tox} Tox
 */
ToxAV.prototype.getTox = function() {
  return this._tox;
};

/**
 * Create the toxav ffi Library object.
 * @param {String} [libpath='libtoxav'] - Path to libtoxav
 */
ToxAV.prototype.createLibrary = function(libpath) {
  libpath = libpath || 'libtoxav';
  return ffi.Library(libpath, {
    'toxav_add_av_groupchat': [ 'int', [ _ToxPtr, _AVGroupCallback, 'pointer' ] ],
    'toxav_join_av_groupchat':  [ 'int', [ _ToxPtr, 'int32', _UInt8Ptr, 'uint16', _AVGroupCallback, 'pointer' ] ],
    'toxav_do':   [ 'void', [ _ToxAVPtr ] ],
    'toxav_do_interval': [ 'uint32', [ _ToxAVPtr ] ],
    'toxav_get_tox':     [ _ToxPtr,  [ _ToxAVPtr ] ],
    'toxav_kill': [ 'void',    [ _ToxAVPtr ] ],
    'toxav_new':  [ _ToxAVPtr, [ _ToxPtr, 'int32' ] ]
  });
};

/**
 * Get the ffi library object.
 * @return toxav library object
 */
ToxAV.prototype.getLibrary = function() {
  return this._toxav;
};

/**
 * Asynchronous toxav_add_av_groupchat(3).
 * @todo audio_callback support
 */
ToxAV.prototype.addGroupchat = function(callback) {
  if(!this._checkToxHandle(callback)) {
    return;
  }

  this.getLibrary().toxav_add_av_groupchat.async(
    this.getTox().getHandle(), ref.NULL, ref.NULL, function(err, res) {
    if(!err && res < 0) {
      err = createNegativeReturnError('toxav_add_av_groupchat', res);
    }

    if(callback) {
      callback(err, res);
    }
  });
};

/**
 * Synchronous toxav_add_av_groupchat(3).
 * @return {Number} Group number
 * @throws Error if toxav_add_av_groupchat returns a negative value
 * @todo audio_callback support
 */
ToxAV.prototype.addGroupchatSync = function() {
  this._checkToxHandleSync();

  var groupnum = this.getLibrary().toxav_add_av_groupchat(this.getTox().getHandle(), ref.NULL, ref.NULL);
  if(groupnum < 0) {
    throw createNegativeReturnError('toxav_add_av_groupchat', res);
  }

  return groupnum;
};

/**
 * Asynchronous toxav_join_av_groupchat(3).
 * @param {Number} friendnum
 * @param {Buffer} data
 * @todo audio_callback support
 */
ToxAV.prototype.joinGroupchat = function(friendnum, data, callback) {
  if(!this._checkToxHandle(callback)) {
    return;
  }

  this.getLibrary().toxav_join_av_groupchat.async(
    this.getTox().getHandle(), friendnum, data, data.length, ref.NULL, ref.NULL, function(err, res) {
      if(!err && res < 0) {
        err = createNegativeReturnError('toxav_join_av_groupchat', res);
      }

      if(callback) {
        callback(err, res);
      }
    });
};

/**
 * Synchronous toxav_join_av_groupchat(3).
 * @param {Number} friendnum
 * @param {Buffer} data
 * @return {Number} Group number
 * @throws Error if toxav_join_av_groupchat returns a negative value
 * @todo audio_callback support
 */
ToxAV.prototype.joinGroupchatSync = function(friendnum, data) {
  this._checkToxHandleSync();

  var groupnum = this.getLibrary().toxav_join_av_groupchat(
    this.getTox().getHandle(), friendnum, data, data.length, ref.NULL, ref.NULL);

  if(groupnum < 0) {
    throw createNegativeReturnError('toxav_join_av_groupchat', groupnum);
  }

  return groupnum;
};

module.exports = ToxAV;
