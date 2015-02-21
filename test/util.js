var assert = require('assert');
var buffertools = require('buffertools');
var should = require('should');
var path = require('path');
var util = require(path.join(__dirname, '..', 'lib', 'util'));

buffertools.extend(); // Extend Buffer.prototype

describe('util', function() {
  var validAddress = '35C51332183D8C3A15BFAEFE559EF65656361ABABAF87D66879318C9EA9B8D5048446515F4AB';
  var validAddressBuffer = new Buffer(validAddress).fromHex();
  describe('#isToxAddress()', function() {
    it('should return true if Tox address (buffer)', function() {
      util.isToxAddress(validAddressBuffer).should.be.true;
    });

    it('should return true if Tox address (string)', function() {
      util.isToxAddress(validAddress).should.be.true;
    });
  });
});
