var ffi = require('ffi');
var path = require('path');
var ref = require('ref');
var Tox = require(path.join(__dirname, 'tox')).Tox;

var _Tox = ref.types.void;
var _ToxPtr = ref.refType(_Tox);
var _UInt8Ptr = ref.refType('uint8');

/**
 * Construct a new ToxEncryptSave.
 * @class
 * @param {Tox} [tox=undefined] Tox instance
 * @param {Object} [opts={}] Options
 * @param {String} [opts.path=undefined] toxencryptsave library path, will
 *                 use the default if not specified
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

  this._toxencryptsave = this.createLibrary(this._libpath);
};

/**
 * Get the ffi library object.
 * @return toxencryptsave library object
 */
ToxEncryptSave.prototype.getLibrary = function() {
  return this._toxencryptsave;
};

/**
 * Get the Tox instance.
 * @return {Tox} Tox instance
 */
ToxEncryptSave.prototype.getTox = function() {
  return this._tox;
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
    'tox_encrypted_size':               [ 'int', [ _ToxPtr ] ],
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
 */
ToxEncryptSave.prototype.getEncryptionExtraLength = function(callback) {
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
 */
ToxEncryptSave.prototype.getKeyLength = function(callback) {
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
 */
ToxEncryptSave.prototype.getSaltLength = function(callback) {
  this.getLibrary().tox_pass_salt_length.async(callback);
};

/**
 * Synchronous tox_pass_salt_length(3).
 * @returns {Number} Salt length
 */
ToxEncryptSave.prototype.getSaltLengthSync = function() {
  return this.getLibrary().tox_pass_salt_length();
};

module.exports = ToxEncryptSave;
