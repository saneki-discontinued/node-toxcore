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

module.exports = {
  fromHex: fromHex,
  isToxAddress: isToxAddress,
  toHex: toHex
};
