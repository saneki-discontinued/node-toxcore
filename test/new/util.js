var assert = require('assert');
var buffertools = require('buffertools');
var should = require('should');
var path = require('path');
var util = require(path.join(__dirname, '..', '..', 'lib', 'new', 'util'));
var size_t = util.size_t;

buffertools.extend(); // Extend Buffer.prototype

describe('util', function() {
  describe('#size_t()', function() {
    it('should return a Buffer', function() {
      var zeroSize = size_t(0);
      should.exist(zeroSize);
    });
  });
});
