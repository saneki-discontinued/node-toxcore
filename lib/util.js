var buffer = require('buffer');
var buffertools = require('buffertools');
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

module.exports = {
  fromHex: fromHex,
  toHex: toHex
};
