var os = require('os');
var ref = require('ref');

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
      size.writeUInt32BE(value, 4);
    } else {
      size.writeUInt32LE(value, 0);
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
  parseProxy: parseProxy,
  size_t: size_t
};
