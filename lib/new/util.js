var buffertools = require('buffertools');
var os = require('os');
var ref = require('ref');
var _ = require('underscore');

buffertools.extend();

/**
 * Convert a hex string to a Buffer. If not a string, will just
 * return what's passed to it.
 * @param {String} hex - Hex string
 * @return {Buffer} data
 */
var fromHex = function(hex) {
  if(_.isString(hex)) {
    return (new Buffer(hex)).fromHex();
  }
  return hex;
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

/**
 * Helper for async functions that pass data through a callback in
 * the form of (Error, Buffer). Will translate the Buffer to a hex
 * String and pass that instead.
 * @param {Function} asyncFunc Asynchronous function to call
 * @param {Callback} callback
 */
var hexify = function(asyncFunc, callback) {
  asyncFunc(function(err, buffer) {
    if(callback) {
      callback(err, buffer.toHex().toString());
    }
  });
};

/**
 * Helper for sync functions that return a Buffer. Will translate
 * the Buffer to a hex String and return that instead.
 * @param {Function} syncFunction Synchronous function to get Buffer from
 */
var hexifySync = function(syncFunction) {
  var addr = syncFunction();
  return addr.toHex().toString();
};

module.exports = {
  fromHex: fromHex,
  hexify: hexify,
  hexifySync: hexifySync,
  parseProxy: parseProxy,
  size_t: size_t
};
