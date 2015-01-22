var ffi = require('ffi');
var path = require('path');
var ref = require('ref');
var Tox = require(path.join(__dirname, 'tox')).Tox;
var sync = require(path.join(__dirname, 'sync'));

var _Tox = ref.types.void;
var _ToxPtr = ref.refType(_Tox);
var _UInt8Ptr = ref.refType('uint8');

/**
 * Construct a new ToxEncryptSave.
 * @class
 * @param {Tox} [tox] Tox instance
 * @param {Object} [opts] Options
 * @param {String} [opts.path] toxencryptsave library path, will
 *                 use the default if not specified
 * @param {Boolean} [opts.sync=true] If true, will have async methods behave
 *                  like sync methods if no callback given
 */
var ToxEncryptSave = function(tox, opts) {
  // If one argument and not tox, assume opts
  if(arguments.length === 1 && !(tox instanceof Tox)) {
    opts = tox;
    tox = undefined;
  }

  if(!(tox instanceof Tox)) {
    tox = undefined;
    //var err = new Error('Tox instance required for ToxEncryptSave');
    //throw err;
  }

  if(!opts) {
    opts = {};
  }

  this._tox = tox;
  this._libpath = opts['path'];

  if(opts['sync'] === undefined || opts['sync'] === null) {
    this._sync = true;
  } else {
    this._sync = !!opts['sync'];
  }

  this._toxencryptsave = this.createLibrary(this._libpath);
};

/**
 * Check whether or not sync functionality should be used as opposed
 * to async, depending on the args.
 * @param {Arguments} args
 * @return {Boolean} true if sync, false if async
 */
ToxEncryptSave.prototype._useSync = function(args) {
  return (this._sync && !sync.hasCallback(args));
};

/**
 * Check that we have a handle, returning an Error via the
 * provided callback if not.
 * @return {Boolean} true if handle, false if no handle
 * @private
 */
ToxEncryptSave.prototype._checkHandle = function(callback) {
  if(!this.getHandle() && callback) {
    callback(this._createNoHandleError());
    return false;
  }

  return true;
};

/**
 * Check that we have a handle, throwing an Error if not.
 * @private
 * @todo More info in Error
 */
ToxEncryptSave.prototype._checkHandleSync = function() {
  if(!this.getHandle()) {
    throw this._createNoHandleError();
  }
};

/**
 * Create an Error to be thrown/returned on no handle.
 * @return {Error} No-handle Error
 * @private
 */
ToxEncryptSave.prototype._createNoHandleError = function() {
  return new Error('No handle');
};

/**
 * Get the ffi library object.
 * @return toxencryptsave library object
 */
ToxEncryptSave.prototype.getLibrary = function() {
  return this._toxencryptsave;
};

/**
 * Get the handle.
 * @return {Object} Handle
 */
ToxEncryptSave.prototype.getHandle = function() {
  if(this._tox) {
    return this._tox.handle;
  }
};

/**
 * Create the toxencryptsave ffi Library object.
 * @param {String} [libpath='libtoxencryptsave'] - Path to libtoxencryptsave
 * @note Leaving out tox_is_save_encrypted as it's an old alias
 * @return {Library} Library
 */
ToxEncryptSave.prototype.createLibrary = function(libpath) {
  libpath = libpath || 'libtoxencryptsave';
  return ffi.Library(libpath, {
    'tox_pass_encryption_extra_length': [ 'int', [] ],
    'tox_pass_key_length':              [ 'int', [] ],
    'tox_pass_salt_length':             [ 'int', [] ],
    'tox_encrypted_size':               [ 'uint32', [ _ToxPtr ] ],
    'tox_pass_encrypt':                 [ 'int', [ _UInt8Ptr, 'uint32', _UInt8Ptr, 'uint32', _UInt8Ptr ] ],
    'tox_encrypted_save':               [ 'int', [ _ToxPtr, _UInt8Ptr, _UInt8Ptr, 'uint32' ] ],
    'tox_pass_decrypt':                 [ 'int', [ _UInt8Ptr, 'uint32', _UInt8Ptr, 'uint32', _UInt8Ptr ] ],
    'tox_encrypted_load':               [ 'int', [ _ToxPtr, _UInt8Ptr, 'uint32', _UInt8Ptr, 'uint32' ] ],
    'tox_derive_key_from_pass':         [ 'int', [ _UInt8Ptr, 'uint32', _UInt8Ptr ] ],
    'tox_derive_key_with_salt':         [ 'int', [ _UInt8Ptr, 'uint32', _UInt8Ptr, _UInt8Ptr ] ],
    'tox_get_salt':                     [ 'int', [ _UInt8Ptr, _UInt8Ptr ] ],
    'tox_pass_key_encrypt':             [ 'int', [ _UInt8Ptr, 'uint32', _UInt8Ptr, _UInt8Ptr ] ],
    'tox_encrypted_key_save':           [ 'int', [ _ToxPtr, _UInt8Ptr, _UInt8Ptr ] ],
    'tox_pass_key_decrypt':             [ 'int', [ _UInt8Ptr, 'uint32', _UInt8Ptr, _UInt8Ptr ] ],
    'tox_encrypted_key_load':           [ 'int', [ _ToxPtr, _UInt8Ptr, 'uint32', _UInt8Ptr ] ],
    'tox_is_data_encrypted':            [ 'int', [ _UInt8Ptr ] ]
  });
};

/**
 * Asynchronous tox_pass_encryption_extra_length(3).
 * If 'sync' option set, will behave synchronously if no callback given.
 * @param {ToxEncryptSave~sizeCallback} [callback]
 */
ToxEncryptSave.prototype.getEncryptionExtraLength = function(callback) {
  if(this._useSync(arguments)) {
    return ToxEncryptSave.prototype.getEncryptionExtraLengthSync.apply(this, arguments);
  }

  this.getLibrary().tox_pass_encryption_extra_length.async(callback);
};

/**
 * Synchronous tox_pass_encryption_extra_length(3).
 * @returns {Number} Encryption extra length
 */
ToxEncryptSave.prototype.getEncryptionExtraLengthSync = function() {
  return this.getLibrary().tox_pass_encryption_extra_length();
};

/**
 * Asynchronous tox_pass_key_length(3).
 * If 'sync' option set, will behave synchronously if no callback given.
 * @param {ToxEncryptSave~sizeCallback} [callback]
 */
ToxEncryptSave.prototype.getKeyLength = function(callback) {
  if(this._useSync(arguments)) {
    return ToxEncryptSave.prototype.getKeyLengthSync.apply(this, arguments);
  }

  this.getLibrary().tox_pass_key_length.async(callback);
};

/**
 * Synchronous tox_pass_key_length(3).
 * @returns {Number} Key length
 */
ToxEncryptSave.prototype.getKeyLengthSync = function() {
  return this.getLibrary().tox_pass_key_length();
};

/**
 * Asynchronous tox_pass_salt_length(3).
 * If 'sync' option set, will behave synchronously if no callback given.
 * @param {ToxEncryptSave~sizeCallback} [callback]
 */
ToxEncryptSave.prototype.getSaltLength = function(callback) {
  if(this._useSync(arguments)) {
    return ToxEncryptSave.prototype.getSaltLengthSync.apply(this, arguments);
  }

  this.getLibrary().tox_pass_salt_length.async(callback);
};

/**
 * Synchronous tox_pass_salt_length(3).
 * @returns {Number} Salt length
 */
ToxEncryptSave.prototype.getSaltLengthSync = function() {
  return this.getLibrary().tox_pass_salt_length();
};

/**
 * Asynchronous tox_encrypted_size(3).
 * If 'sync' option set, will behave synchronously if no callback given.
 * @param {ToxEncryptSave~sizeCallback} [callback]
 */
ToxEncryptSave.prototype.getEncryptedSize = function(callback) {
  if(this._useSync(arguments)) {
    return ToxEncryptSave.prototype.getEncryptedSizeSync.apply(this, arguments);
  }

  if(!this._checkHandle(callback)) {
    return;
  }

  this.getLibrary().tox_encrypted_size.async(this.getHandle(), callback);
};

/**
 * Synchronous tox_encrypted_size(3).
 * @returns {Number} Encrypted size
 */
ToxEncryptSave.prototype.getEncryptedSizeSync = function() {
  this._checkHandleSync();

  return this.getLibrary().tox_encrypted_size(this.getHandle());
};

/**
 * Callback that returns some size.
 * @callback ToxEncryptSave~sizeCallback
 * @param {Number} Size
 */

module.exports = ToxEncryptSave;
