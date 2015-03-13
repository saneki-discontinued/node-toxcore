var os = require('os');
var ref = require('ref');

/**
 * Get a "size_t type" (Buffer) from a Number.
 * @param {Number} value
 * @return {Buffer} size_t
 */
var size_t = function(value) {
  if(isNaN(value)) {
    // @todo: Throw error
  } else if(value < 0) {
    // @todo: Throw error
  }

  var size = ref.alloc('size_t'),
      e = os.endianness();

  size.fill(0);

  // @todo: Fix for 64-bit integers?
  if(size.length === 8) {
    if(e === 'BE') {
      size.writeUInt32BE(value, 0);
    } else {
      size.writeUInt32LE(value, 4);
    }
  } else if(size.length === 4) {
    if(e === 'BE') {
      size.writeUInt32BE(value, 0);
    } else {
      size.writeUInt32LE(value, 0);
    }
  } else if (size.length === 2) {
    if(e === 'BE') {
      size.writeUInt16BE(value, 0);
    } else {
      size.writeUInt16LE(value, 0);
    }
  } else if (size.length === 1) {
    size.writeUInt8(value, 0);
  } else {
    // @todo: Throw
  }

  return size;
};

module.exports = {
  size_t: size_t
};
