var assert = require('assert');
var buffertools = require('buffertools');
var should = require('should');
var path = require('path');
var toxcore = require(path.join(__dirname, '..', 'lib', 'main'));

buffertools.extend(); // Extend Buffer.prototype

describe('ToxDns', function() {
  var toxdns = new toxcore.ToxDns(),
      toxdnsKilled = new toxcore.ToxDns();
  toxdnsKilled.killSync();

  describe('#hasHandle()', function() {
    it('should return true when handle', function() {
      toxdns.hasHandle().should.be.true;
    });

    it('should return false when killed', function() {
      toxdnsKilled.hasHandle().should.be.false;
    });
  });
});
