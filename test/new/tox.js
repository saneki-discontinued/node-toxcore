var assert = require('assert');
var should = require('should');
var path = require('path');
var Tox = require(path.join(__dirname, '..', '..', 'lib', 'new', 'tox'));

describe('Tox', function() {
  var tox = new Tox();
  tox.start();

  var toxNoUdp = new Tox({ udp: false });
  toxNoUdp.start();

  var customPort = 33510;
  var toxCustomPort = new Tox({ startPort: customPort, endPort: customPort });
  toxCustomPort.start();

  describe('#getUdpPort(), #getUdpPortSync()', function() {
    it('should return a Number with udp enabled by default', function() {
      var port = tox.getUdpPortSync();
      port.should.be.a.Number;
      port.should.be.greaterThan(0);
    });

    it('should return a Number with udp enabled by default (async)', function(done) {
      tox.getUdpPort(function(err, port) {
        port.should.be.a.Number;
        port.should.be.greaterThan(0);
        done(err);
      });
    });

    it('should return the port specified', function() {
      var port = toxCustomPort.getUdpPortSync();
      port.should.equal(customPort);
    });

    it('should return the port specified (async)', function(done) {
      toxCustomPort.getUdpPort(function(err, port) {
        port.should.equal(customPort);
        done(err);
      });
    });

    it('should throw a not-bound error if not listening on udp', function() {
      (function() { toxNoUdp.getUdpPortSync(); }).should.throw();
    });

    it('should return a not-bound error if not listening on udp (async)', function(done) {
      toxNoUdp.getUdpPort(function(err, port) {
        should.exist(err);
        done();
      });
    });
  });

  describe('#getTcpPort(), #getTcpPortSync()', function() {
    it('should throw a not-bound error if not a tcp relay', function() {
      (function() { tox.getTcpPortSync(); }).should.throw();
    });

    it('should return a not-bound error if not a tcp relay (async)', function(done) {
      tox.getTcpPort(function(err, port) {
        should.exist(err);
        done();
      });
    });
  });

  describe('#isUdp()', function() {
    it('should return true with udp enabled by default', function() {
      tox.isUdp().should.be.true;
    });

    it('should return false if not listening on an udp port', function() {
      toxNoUdp.isUdp().should.be.false;
    });
  });

  describe('#isTcp()', function() {
    it('should return false if not a tcp relay', function() {
      tox.isTcp().should.be.false;
    });
  });
});
