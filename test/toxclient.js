var assert = require('assert');
var should = require('should');
var path = require('path');
var ToxClient = require(path.join(__dirname, '..', 'lib', 'hla', 'toxclient'));

// Copied from test/tox.js, make more portable?
var addressRegex = /^[0-9a-fA-F]{76}$/;

describe('ToxClient', function() {
  var client = new ToxClient();

  describe('#address()', function() {
    it('should return the address as an upper-case string', function() {
      client.address().should.match(addressRegex);
    });
  });

  describe('#name()', function() {
    it('should set and get the tox name', function() {
      var name = 'Some name';
      client.name(name);
      client.name().should.equal(name);
    });
  });

  describe('#statusMessage()', function() {
    it('should set and get the tox status message', function() {
      var message = 'Some status message';
      client.statusMessage(message);
      client.statusMessage().should.equal(message);
    });
  });

  describe('#status()', function() {
    it('should set and get the tox status (valid string)', function() {
      var status = 'away';
      client.status(status);
      client.status().should.equal(status);
    });
  });
});
