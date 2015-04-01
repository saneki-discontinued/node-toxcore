var assert = require('assert');
var should = require('should');
var path = require('path');
var Tox = require(path.join(__dirname, '..', '..', 'lib', 'new', 'tox'));
var consts = require(path.join(__dirname, '..', '..', 'lib', 'new', 'consts'));

// @todo: Cleanup (kill tox instances afterwards)
describe('Tox', function() {
  var tox = new Tox();
  tox.start();

  var toxNoUdp = new Tox({ udp: false });
  toxNoUdp.start();

  var customPort = 33510;
  var toxCustomPort = new Tox({ startPort: customPort, endPort: customPort });
  toxCustomPort.start();

  var toxDead = new Tox();
  toxDead.free();

  var addressRegex = /^[0-9a-fA-F]{76}$/;

  describe('#getAddress(), #getAddressSync()', function() {
    it('should return a buffer of expected size', function() {
      var addr = tox.getAddressSync();
      addr.should.be.a.Buffer;
      addr.length.should.equal(consts.TOX_FRIEND_ADDRESS_SIZE);
    });

    it('should return a buffer of expected size (async)', function(done) {
      tox.getAddress(function(err, addr) {
        addr.should.be.a.Buffer;
        addr.length.should.equal(consts.TOX_FRIEND_ADDRESS_SIZE);
        done(err);
      });
    });
  });

  describe('#getAddressHex(), #getAddressHexSync()', function() {
    it('should return an address as a hex string', function() {
      var addr = tox.getAddressHexSync();
      addr.should.match(addressRegex);
    });

    it('should return an address as a hex string (async)', function(done) {
      tox.getAddressHex(function(err, addr) {
        addr.should.match(addressRegex);
        done(err);
      });
    });
  });

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

    it('should throw an error if no handle', function() {
      (function() { toxDead.getUdpPortSync(); }).should.throw();
    });

    it('should return an error if no handle (async)', function(done) {
      toxDead.getUdpPort(function(err, port) {
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

  describe('#getOptions()', function() {
    it('should handle proxies', function() {
      var prox1 = new Tox({ proxy: { type: 'http', address: '12.34.56.92', port: 9411 } }),
          opts1 = prox1.getOptions();
      opts1.proxy_type.should.equal(consts.TOX_PROXY_TYPE_HTTP);
      opts1.proxy_address.should.equal('12.34.56.92');
      opts1.proxy_port.should.equal(9411);
      prox1.free();
    });
  });
});
