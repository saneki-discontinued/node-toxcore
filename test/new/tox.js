var assert = require('assert');
var should = require('should');
var path = require('path');
var Tox = require(path.join(__dirname, '..', '..', 'lib', 'new', 'tox'));

describe('Tox', function() {
  var tox = new Tox();
  tox.start();

  describe('#getUdpPortSync()', function() {
    it('should return a Number with udp enabled by default', function() {
      var port = tox.getUdpPortSync();
      port.should.be.a.Number;
      port.should.be.greaterThan(0);
    });
  });

  describe('#getTcpPortSync()', function() {
    it('should throw a not-bound error if not a tcp relay', function() {
      (function() { tox.getTcpPortSync(); }).should.throw();
    });
  });

  describe('#isUdp()', function() {
    it('should return true with udp enabled by default', function() {
      tox.isUdp().should.be.true;
    });
  });

  describe('#isTcp()', function() {
    it('should return false if not a tcp relay', function() {
      tox.isTcp().should.be.false;
    });
  });
});
