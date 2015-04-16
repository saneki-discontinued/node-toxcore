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
var path = require('path');
var _ = require('underscore');
var consts = require(path.join(__dirname, 'consts'));
buffertools.extend();

/**
 * Get a hex String from a Buffer.
 * @param {Buffer} buffer Buffer
 * @return {String} Hex String
 */
var toHex = function(buffer) {
  return buffer.toHex().toString();
};

/**
 * Get a Buffer from a hex String.
 * @param {String} str Hex String
 * @return {Buffer} Buffer
 */
var fromHex = function(str) {
  return (new Buffer(str)).fromHex();
};

/**
 * Whether or not some Buffer or String might represent a Tox address. Will return
 * false if not a Buffer or String.
 * @param {(Buffer|String)} addr
 * @return {Boolean} true if possible Tox address, false if not
 */
var isToxAddress = function(addr) {
  if(_.isString(addr)) {
    return addr.length === (consts.TOX_FRIEND_ADDRESS_SIZE * 2)
      && /^[0-9a-f]+$/i.test(addr);
  }
  else if(addr instanceof Buffer) {
    return addr.length === (consts.TOX_FRIEND_ADDRESS_SIZE);
  }
  return false;
};

/**
 * Try to parse an address:port string.
 * @return {Object} Object with address and port if successful,
 *                  undefined if not.
 */
var parseAddress = function(str) {
  var ex = /^[^:]+:(\\d+)$/;
  if(ex.test(str)) {
    var res = ex.exec(str);
    return {
      address: res[1],
      port: res[2]
    };
  }
};

/**
 * Try to parse a Tox proxy string.
 * @return {Object} Proxy object if successful, undefined if not
 */
var parseProxy = function(str) {
  var type;
  if(str.indexOf('http://') === 0) {
    str = str.slice('http://'.length);
    type = 'http';
  } else if(str.indexOf('socks://') === 0) {
    str = str.slice('socks://'.length);
    type = 'socks';
  } else if(str.indexOf('socks5://') === 0) {
    str = str.slice('socks5://'.length);
    type = 'socks';
  }

  var proxy = parseAddress(str);
  if(proxy) {
    proxy.type = type;
    return proxy;
  }
};

module.exports = {
  fromHex: fromHex,
  isToxAddress: isToxAddress,
  parseAddress: parseAddress,
  parseProxy: parseProxy,
  toHex: toHex
};
