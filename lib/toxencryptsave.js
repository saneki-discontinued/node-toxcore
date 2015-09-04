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

var ffi = require('ffi');
var path = require('path');
var ref = require('ref');
var RefArray = require('ref-array');
var RefStruct = require('ref-struct');
var _ = require('underscore');

var consts = require(path.join(__dirname, 'consts'));
var errors = require(path.join(__dirname, 'errors'));

var ToxPassKey = RefStruct({
  'salt': RefArray('uint8', consts.TOX_PASS_SALT_LENGTH),
  'key': RefArray('uint8', consts.TOX_PASS_KEY_LENGTH)
});

// Common types
var UInt8Ptr = ref.refType('uint8');

// Tox enums and error types
var CEnum = 'int32';
var TOX_ERR_DECRYPTION = CEnum;
var TOX_ERR_ENCRYPTION = CEnum;
var TOX_ERR_KEY_DERIVATION = CEnum;

/**
 * Creates a ToxEncryptSave instance.
 * @class
 * @param {(Object|String)} [opts] Options
 */
var ToxEncryptSave = function(opts) {
  // If opts is a string, assume libpath
  if(_.isString(opts)) {
    opts = { path: opts }
  }

  if(!opts) opts = {};
  var libpath = opts['path'];

  this._library = this._createLibrary(libpath);
};

/**
 * @private
 */
ToxEncryptSave.prototype._createLibrary = function(libpath) {
  libpath = libpath || 'libtoxencryptsave';
  return ffi.Library(libpath, {
    'tox_derive_key_from_pass': [ 'bool', [ UInt8Ptr, 'size_t', ref.refType(ToxPassKey), ref.refType(TOX_ERR_KEY_DERIVATION) ] ],
    'tox_derive_key_with_salt': [ 'bool', [ UInt8Ptr, 'size_t', UInt8Ptr, ref.refType(ToxPassKey), ref.refType(TOX_ERR_KEY_DERIVATION) ] ],
    'tox_get_salt':             [ 'bool', [ UInt8Ptr, UInt8Ptr ] ],
    'tox_is_data_encrypted':    [ 'bool', [ UInt8Ptr ] ],
    'tox_pass_decrypt':         [ 'bool', [ UInt8Ptr, 'size_t', UInt8Ptr, 'size_t', UInt8Ptr, ref.refType(TOX_ERR_DECRYPTION) ] ],
    'tox_pass_encrypt':         [ 'bool', [ UInt8Ptr, 'size_t', UInt8Ptr, 'size_t', UInt8Ptr, ref.refType(TOX_ERR_ENCRYPTION) ] ],
    'tox_pass_key_decrypt':     [ 'bool', [ UInt8Ptr, 'size_t', ref.refType(ToxPassKey), UInt8Ptr, ref.refType(TOX_ERR_DECRYPTION) ] ],
    'tox_pass_key_encrypt':     [ 'bool', [ UInt8Ptr, 'size_t', ref.refType(ToxPassKey), UInt8Ptr, ref.refType(TOX_ERR_ENCRYPTION) ] ]
  });
};

/**
 * Asynchronous tox_pass_decrypt(3).
 * @param {Buffer} data - Data to decrypt
 * @param {(Buffer|String)} pass - Password to decrypt with
 * @param {ToxEncryptSave~dataCallback} [callback]
 */
ToxEncryptSave.prototype.decrypt = function(data, pass, callback) {
  if(_.isString(pass)) pass = new Buffer(pass);
  var eptr = ref.alloc(TOX_ERR_DECRYPTION),
      out = new Buffer(data.length - consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH);
  this.getLibrary().tox_pass_decrypt.async(data, data.length, pass, pass.length, out, eptr, function(err, success) {
    var terr = errors.decryption(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err, out);
    }
  });
};

/**
 * Synchronous tox_pass_decrypt(3).
 * @param {Buffer} data - Data to decrypt
 * @param {(Buffer|String)} pass - Password to decrypt with
 * @return {Buffer} Decrypted data
 */
ToxEncryptSave.prototype.decryptSync = function(data, pass) {
  if(_.isString(pass)) pass = new Buffer(pass);
  var eptr = ref.alloc(TOX_ERR_DECRYPTION),
      out = new Buffer(data.length - consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH),
      success = this.getLibrary().tox_pass_decrypt(data, data.length, pass, pass.length, out, eptr);
  var err = errors.decryption(eptr.deref());
  if(err) throw err;
  else if(!success) throw errors.unsuccessful();
  return out;
};

/**
 * Asynchronous tox_pass_encrypt(3).
 * @param {Buffer} data - Data to encrypt
 * @param {(Buffer|String)} pass - Password to encrypt with
 * @param {ToxEncryptSave~dataCallback} [callback]
 */
ToxEncryptSave.prototype.encrypt = function(data, pass, callback) {
  if(_.isString(pass)) pass = new Buffer(pass);
  var eptr = ref.alloc(TOX_ERR_ENCRYPTION),
      out = new Buffer(data.length + consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH);
  this.getLibrary().tox_pass_encrypt.async(data, data.length, pass, pass.length, out, eptr, function(err, success) {
    var terr = errors.encryption(eptr.deref());
    if(!err && terr) err = terr;
    if(!err && !success) err = errors.unsuccessful();
    if(callback) {
      callback(err, out);
    }
  });
};

/**
 * Synchronous tox_pass_encrypt(3).
 * @param {Buffer} data - Data to encrypt
 * @param {(Buffer|String)} pass - Password to encrypt with
 * @return {Buffer} Decrypted data
 */
ToxEncryptSave.prototype.encryptSync = function(data, pass) {
  if(_.isString(pass)) pass = new Buffer(pass);
  var eptr = ref.alloc(TOX_ERR_ENCRYPTION),
      out = new Buffer(data.length + consts.TOX_PASS_ENCRYPTION_EXTRA_LENGTH),
      success = this.getLibrary().tox_pass_encrypt(data, data.length, pass, pass.length, out, eptr);
  var err = errors.encryption(eptr.deref());
  if(err) throw err;
  else if(!success) throw errors.unsuccessful();
  return out;
};

/**
 * Asynchronous tox_is_data_encrypted(3).
 * @param {Buffer} data - Data to check
 * @param {ToxEncryptSave~booleanCallback} [callback]
 */
ToxEncryptSave.prototype.isDataEncrypted = function(data, callback) {
  this.getLibrary().tox_is_data_encrypted.async(data, function(err, val) {
    if(callback) {
      callback(err, val);
    }
  });
};

/**
 * Synchronous tox_is_data_encrypted(3).
 * @param {Buffer} data - Data to check
 * @return {Boolean} true if data is encrypted, false if not
 */
ToxEncryptSave.prototype.isDataEncryptedSync = function(data) {
  return this.getLibrary().tox_is_data_encrypted(data);
};

/**
 * Asynchronous tox_derive_key_from_pass(3).
 * @param {(Buffer|String)} pass - Password to derive key from
 * @param {ToxEncryptSave~passKeyCallback} [callback]
 */
ToxEncryptSave.prototype.deriveKeyFromPass = function(pass, callback) {
  this._performDerive({
    api: this.getLibrary().tox_derive_key_from_pass.async,
    pass: pass,
    useSalt: false,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_derive_key_from_pass(3).
 * @param {(Buffer|String)} pass - Password to derive key from
 * @return {PassKeyObject} Object containing a key and a salt
 */
ToxEncryptSave.prototype.deriveKeyFromPassSync = function(pass) {
  return this._performDerive({
    api: this.getLibrary().tox_derive_key_from_pass,
    pass: pass,
    useSalt: false,
    async: false
  });
};

/**
 * Asynchronous tox_derive_key_with_salt(3).
 * @param {(Buffer|String)} pass - Password to derive key from
 * @param {Buffer} salt - Salt to use
 * @param {ToxEncryptSave~passKeyCallback} [callback]
 */
ToxEncryptSave.prototype.deriveKeyWithSalt = function(pass, salt, callback) {
  this._performDerive({
    api: this.getLibrary().tox_derive_key_with_salt.async,
    pass: pass,
    salt: salt, useSalt: true,
    async: true, callback: callback
  });
};

/**
 * Synchronous tox_derive_key_with_salt(3).
 * @param {(Buffer|String)} pass - Password to derive key from
 * @param {Buffer} salt - Salt to use
 * @return {PassKeyObject} Object containing a key and a salt
 */
ToxEncryptSave.prototype.deriveKeyWithSaltSync = function(pass, salt) {
  return this._performDerive({
    api: this.getLibrary().tox_derive_key_with_salt,
    pass: pass,
    salt: salt, useSalt: true,
    async: false
  });
};

/**
 * Get the internal Library instance.
 * @return {ffi.Library}
 */
ToxEncryptSave.prototype.getLibrary = function() {
  return this._library;
};

/**
 * Helper wrapper function for key derivation functions.
 * @private
 */
ToxEncryptSave.prototype._performDerive = function(opts) {
  var api = opts['api'],
      pass = opts['pass'],
      salt = opts['salt'], useSalt = opts['useSalt'],
      async = opts['async'], callback = opts['callback'];

  if(_.isString(pass)) pass = new Buffer(pass);
  var out = ref.alloc(ToxPassKey),
      eptr = ref.alloc(TOX_ERR_KEY_DERIVATION);

  if(useSalt) {
    api = api.bind(undefined, pass, pass.length, salt, out, eptr);
  } else {
    api = api.bind(undefined, pass, pass.length, out, eptr);
  }

  if(async) {
    api(function(err, success) {
      var terr = errors.keyDerivation(eptr.deref());
      if(!err && terr) err = terr;
      if(!err && !success) err = errors.unsuccessful();
      if(callback) {
        if(!err) {
          out = { key: new Buffer(out.deref().key), salt: new Buffer(out.deref().salt) };
          callback(err, out);
        } else {
          callback(err);
        }
      }
    });
  } else {
    var success = api(),
        err = errors.keyDerivation(eptr.deref());
    if(err) throw err;
    else if(!success) throw errors.unsuccessful();
    return { key: new Buffer(out.deref().key), salt: new Buffer(out.deref().salt) };
  }
};

/**
 * Callback that returns some boolean.
 * @callback ToxEncryptSave~booleanCallback
 * @param {Error} error - error, if any
 * @param {Boolean} value
 */

/**
 * Callback that returns some data in a Buffer.
 * @callback ToxEncryptSave~dataCallback
 * @param {Error} error - error, if any
 * @param {Buffer} data
 */

/**
 * Callback that returns an object containing a key and a salt.
 * @callback ToxEncryptSave~passKeyCallback
 * @param {Error} error - error, if any
 * @param {Object} data - Object containing key and salt
 * @param {Buffer} data.key - Key
 * @param {Buffer} data.salt - Salt
 */

module.exports = ToxEncryptSave;
