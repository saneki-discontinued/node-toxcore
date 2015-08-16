/*
 * This file is part of node-toxcore.
 *
 * node-toxcore is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * node-toxcore is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with node-toxcore. If not, see <http://www.gnu.org/licenses/>.
 *
 */

var assert = require('assert');
var should = require('should');
var path = require('path');
var ToxClient = require(path.join(__dirname, '..', 'lib', 'hla', 'toxclient'));

// Copied from test/tox.js, make more portable?
var addressRegex = /^[0-9a-fA-F]{76}$/;
var keyRegex = /^[0-9a-fA-F]{64}$/;

describe('ToxClient', function() {
  var client = new ToxClient();

  describe('constructor', function() {
    it('should set the name, status message and status from a buffer', function() {
      var anotherClient = new ToxClient({
        name: 'A name', statusMessage: 'A message', status: 'busy'
      });
      anotherClient.name().should.equal('A name');
      anotherClient.statusMessage().should.equal('A message');
      anotherClient.status().should.equal('busy');
    });

    it('should load savedata from a buffer', function() {
      var anotherClient = new ToxClient({ data: client.savedata() });
      anotherClient.publicKey().should.equal(client.publicKey());
    });
  });

  describe('#address()', function() {
    it('should return the address as an upper-case hex string', function() {
      client.address().should.match(addressRegex);
    });
  });

  describe('#publicKey()', function() {
    it('should return the public key as an upper-case hex string', function() {
      client.publicKey().should.match(keyRegex);
    });

    it('should be contained within the address', function() {
      client.address().indexOf(client.publicKey()).should.equal(0);
    });
  });

  describe('#secretKey()', function() {
    it('should return the secret key as an upper-case hex string', function() {
      client.secretKey().should.match(keyRegex);
    });

    it('should not equal the public key', function() {
      client.secretKey().should.not.equal(client.publicKey());
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

    it('should set and get the tox status when given a case-mixed string', function() {
      client.status('BusY');
      client.status().should.equal('busy');
      client.status('NONE');
      client.status().should.equal('none');
      client.status('aWAY');
      client.status().should.equal('away');
    });
  });
});
