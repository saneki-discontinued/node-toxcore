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
var events = require('events');
var fs = require('fs');
var ref = require('ref');
var ffi = require('ffi');
var path = require('path');
var _ = require('underscore');
var RefStruct = require('ref-struct');
var RefArray = require('ref-array');
var consts = require(path.join(__dirname, 'consts'));
var errors = require(path.join(__dirname, 'errors'));

buffertools.extend();

var TOX_FRIEND_ADDRESS_SIZE = consts.TOX_FRIEND_ADDRESS_SIZE;
var TOXDNS_MAX_RECOMMENDED_NAME_LENGTH = consts.TOXDNS_MAX_RECOMMENDED_NAME_LENGTH;

var createNegativeReturnError = errors.createNegativeReturnError;
var createNonZeroReturnError = errors.createNonZeroReturnError;

// Public keys
var TOXDNS_PUBKEY_TOXME_SE = '57AA48BB8CB1CC9FC67837964A28DB0184137E37BB158B5409815382F9257FBF';

var _UInt8Ptr = ref.refType('uint8');
var _UInt32Ptr = ref.refType('uint32');
var _VoidPtr = ref.refType('void');

var ToxDns = function(opts) {
  if(!opts) opts = {};
  var libpath = opts['path'];
  var key = opts['key'];

  this.toxdns = this.createLibrary(libpath);
  this.initKey(key);
  this.initHandle(this.key);
};

/**
 * Create the library instance (libtoxdns).
 * @param {String} [libpath='libtoxdns'] - Path to libtoxdns
 * @return {Object}
 */
ToxDns.prototype.createLibrary = function(libpath) {
  libpath = libpath || 'libtoxdns';
  return ffi.Library(libpath, {
    'tox_dns3_new':  [ _VoidPtr, [ _UInt8Ptr ] ],
    'tox_dns3_kill': [ 'void', [ _VoidPtr ] ],
    'tox_generate_dns3_string': [ 'int', [ _VoidPtr, _UInt8Ptr, 'uint16', _UInt32Ptr, _UInt8Ptr, 'uint8' ] ],
    'tox_decrypt_dns3_TXT': [ 'int', [ _VoidPtr, _UInt8Ptr, _UInt8Ptr, 'uint32', 'uint32' ] ]
  });
};

/**
 * Initialize the public key.
 * @param {(Buffer|String)} key Public key
 */
ToxDns.prototype.initKey = function(key) {
  if(!key) {
    key = TOXDNS_PUBKEY_TOXME_SE; // Use toxme.se public key by default
  }

  // If key is a String, assume a hex String
  if(_.isString(key)) {
    key = new Buffer(key).fromHex();
  }

  this.key = key;
};

/**
 * Check if this ToxDns instance has a handle.
 * @return {Boolean} true if it has a handle, false if not
 */
ToxDns.prototype.hasHandle = function() {
  return (this.handle !== undefined && this.handle !== null);
};

/**
 * Synchronous tox_dns3_new(3).
 * Initializes the handle for this ToxDns instance.
 * @param {Buffer} buffer Server's public key
 */
ToxDns.prototype.initHandle = function(buffer) {
  if(buffer) {
    this.handle = this.toxdns.tox_dns3_new(buffer);
  }
};

/**
 * Asynchronous tox_dns3_kill(3).
 */
ToxDns.prototype.kill = function(callback) {
  var toxdns = this;
  this.toxdns.tox_dns3_kill.async(this.handle, function(err) {
    if(!err) {
      toxdns.handle = undefined;
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
  this.toxdns.tox_dns3_kill(this.handle);
  this.handle = undefined;
};

/**
 * Asynchronous tox_generate_dns3_string(3).
 * @param {String} name
 */
ToxDns.prototype.generateString = function(name, callback) {
  var namebuf = new Buffer(name),
      outbuf = new Buffer(64),
      requestId = ref.alloc(ref.refType('uint32'));

  this.toxdns.tox_generate_dns3_string.async(
    this.handle, outbuf, outbuf.length, requestId, namebuf, namebuf.length, function(err, res) {
    if(!err && res < 0) {
      err = createNegativeReturnError('tox_generate_dns3_string', res);
    }

    var str, id;
    if(!err) {
      str = outbuf.slice(0, res).toString();
      id = requestId.deref();
    }

    if(callback) {
      callback(err, str, id);
    }
  });
};

/**
 * Asynchronous tox_decrypt_dns3_TXT(3).
 * @param {String} record
 * @param {Number} requestId
 */
ToxDns.prototype.decrypt = function(record, requestId, callback) {
  var toxId = new Buffer(TOX_FRIEND_ADDRESS_SIZE),
      recordBuffer = new Buffer(record);

  this.toxdns.tox_decrypt_dns3_TXT.async(
    this.handle, toxId, recordBuffer, recordBuffer.length, requestId, function(err, res) {
    if(!err && res !== 0) {
      err = createNonZeroReturnError('tox_decrypt_dns3_TXT', res);
    }

    if(callback) {
      callback(err, toxId);
    }
  });
};

module.exports = ToxDns;
