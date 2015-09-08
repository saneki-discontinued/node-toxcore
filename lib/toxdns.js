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

var buffertools = require('buffertools');
var ref = require('ref');
var ffi = require('ffi');
var path = require('path');
var _ = require('underscore');
var consts = require(path.join(__dirname, 'consts'));
var errors = require(path.join(__dirname, 'errors'));

buffertools.extend();

// No idea if there's actually a max size, this should be good enough
var TOXDNS3_RECORD_SIZE_MAX = 1024;

// Public keys
var TOXDNS_PUBKEY_TOXME_IO = '1A39E7A5D5FA9CF155C751570A32E625698A60A55F6D88028F949F66144F4F25';

// Common types
var UInt8Ptr = ref.refType('uint8');
var UInt32Ptr = ref.refType('uint32');
var VoidPtr = ref.refType('void');

var ToxDns = function(opts) {
  if(!opts) opts = {};
  var libpath = opts['path'];
  var key = opts['key'];

  this._library = this._createLibrary(libpath);
  this._initKey(key);
  this._initHandle(this._key);
};

/**
 * Get the internal Library instance.
 * @return {ffi.Library}
 */
ToxDns.prototype.getLibrary = function() {
  return this._library;
}

/**
 * Create the libtoxdns Library instance (libtoxdns).
 * @private
 * @param {String} [libpath='libtoxdns'] - Path to libtoxdns
 * @return {ffi.Library}
 */
ToxDns.prototype._createLibrary = function(libpath) {
  libpath = libpath || 'libtoxdns';
  return ffi.Library(libpath, {
    'tox_dns3_new':  [ VoidPtr, [ UInt8Ptr ] ],
    'tox_dns3_kill': [ 'void', [ VoidPtr ] ],
    'tox_generate_dns3_string': [ 'int', [ VoidPtr, UInt8Ptr, 'uint16', UInt32Ptr, UInt8Ptr, 'uint8' ] ],
    'tox_decrypt_dns3_TXT': [ 'int', [ VoidPtr, UInt8Ptr, UInt8Ptr, 'uint32', 'uint32' ] ]
  });
};

/**
 * Initialize the public key.
 * @private
 * @param {(Buffer|String)} key - Public key
 */
ToxDns.prototype._initKey = function(key) {
  if(!key) {
    key = TOXDNS_PUBKEY_TOXME_IO; // Use toxme.io public key by default
  }

  // If key is a String, assume a hex String
  if(_.isString(key)) {
    key = new Buffer(key).fromHex();
  }

  this._key = key;
};

/**
 * Get the handle object.
 * @return {Object}
 */
ToxDns.prototype.getHandle = function() {
  return this._handle;
}

/**
 * Whether or not this ToxDns instance has a handle.
 * @return {Boolean} true if handle, false if not
 */
ToxDns.prototype.hasHandle = function() {
  return !!this.getHandle();
};

/**
 * Synchronous tox_dns3_new(3).
 * Initializes the handle for this ToxDns instance.
 * @private
 * @param {Buffer} buffer - Server's public key
 */
ToxDns.prototype._initHandle = function(buffer) {
  if(buffer) {
    this._handle = this.getLibrary().tox_dns3_new(buffer);
  }
};

/**
 * Asynchronous tox_dns3_kill(3).
 */
ToxDns.prototype.kill = function(callback) {
  var toxdns = this;
  this.getLibrary().tox_dns3_kill.async(this.getHandle(), function(err) {
    if(!err) {
      toxdns._handle = undefined;
    }

    if(callback) {
      callback(err);
    }
  });
};

/**
 * Synchronous tox_dns3_kill(3).
 */
ToxDns.prototype.killSync = function() {
  this.getLibrary().tox_dns3_kill(this.getHandle());
  this._handle = undefined;
};

/**
 * Asynchronous tox_generate_dns3_string(3).
 * @param {String} name - Name to generate a request string for
 * @param {ToxDns~generateCallback} [callback]
 */
ToxDns.prototype.generate = function(name, callback) {
  var namebuf = new Buffer(name),
      outbuf = new Buffer(TOXDNS3_RECORD_SIZE_MAX),
      requestId = ref.alloc('uint32');

  this.getLibrary().tox_generate_dns3_string.async(
    this.getHandle(), outbuf, outbuf.length, requestId, namebuf, namebuf.length, function(err, res) {
    if(!err && res < 0) {
      //err = createNegativeReturnError('tox_generate_dns3_string', res);
      // TODO: Better errors
      err = new Error('tox_generate_dns3_string returned ' + res);
    }

    var str, id;
    if(!err) {
      str = outbuf.slice(0, res).toString();
      id = Number(requestId.deref());
    }

    if(callback) {
      callback(err, { record: str, id: id });
    }
  });
};

/**
 * Synchronous tox_generate_dns3_string(3).
 * @param {String} name - Name to generate a request string for
 * @return {Object} Object containing an 'id' (Number)
 *                  and a generated 'record' (String)
 */
ToxDns.prototype.generateSync = function(name) {
  var namebuf = new Buffer(name),
      outbuf = new Buffer(TOXDNS3_RECORD_SIZE_MAX),
      requestId = ref.alloc('uint32'),
      length = this.getLibrary().tox_generate_dns3_string(
      this.getHandle(), outbuf, outbuf.length, requestId, namebuf, namebuf.length);
  if(length < 0) throw new Error('tox_generate_dns3_string returned ' + length);
  var str = outbuf.slice(0, length).toString(),
      id = Number(requestId.deref());
  return { record: str, id: id };
};

/**
 * Asynchronous tox_decrypt_dns3_TXT(3).
 * @param {String} record
 * @param {Number} requestId
 * @param {ToxDns~dataCallback} [callback]
 */
ToxDns.prototype.decrypt = function(record, requestId, callback) {
  var toxId = new Buffer(consts.TOX_FRIEND_ADDRESS_SIZE),
      recordBuffer = new Buffer(record);

  this.getLibrary().tox_decrypt_dns3_TXT.async(
    this.getHandle(), toxId, recordBuffer, recordBuffer.length, requestId, function(err, res) {
    if(!err && res !== 0) {
      //err = createNonZeroReturnError('tox_decrypt_dns3_TXT', res);
      err = new Error('tox_decrypt_dns3_TXT returned ' + res);
    }

    if(callback) {
      callback(err, toxId);
    }
  });
};

/**
 * Asynchronous tox_decrypt_dns3_TXT(3).
 * @param {String} record
 * @param {Number} requestId
 * @return {Buffer} Tox address
 */
ToxDns.prototype.decryptSync = function(record, requestId) {
  var toxId = new Buffer(consts.TOX_FRIEND_ADDRESS_SIZE),
      recordBuffer = new Buffer(record),
      success = this.getLibrary().tox_decrypt_dns3_TXT(
      this.getHandle(), toxId, recordBuffer, recordBuffer.length, requestId);
  if(success !== 0) throw new Error('tox_decrypt_dns3_TXT returned ' + success);
  return toxId;
};

module.exports = ToxDns;
