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
var buffertools = require('buffertools');
var dns = require('dns');
var path = require('path');
var should = require('should');
var util = require('util');
var ToxDns = require(path.join(__dirname, '..', '..', 'lib', 'toxdns'));

buffertools.extend(); // Extend Buffer.prototype

describe('ToxDns (non-CI)', function() {
  var toxdns = new ToxDns();

  // This may fail if not resolved within 2 seconds
  // These tests seem to always fail on travis-ci, specifically
  // finding the id from txts[0][0]
  describe('generating and decrypting', function() {
    it('should do stuff right (manually)', function(done) {
      var info = toxdns.generateSync('saneki'),
          full = util.format('_%s._tox.%s', info.record, 'toxme.io');
      dns.resolveTxt(full, function(err, txts) {
        if(!err) {
          var result = txts[0][0],
              id = result.match(/(^|;)id=([a-zA-Z0-9]+)/)[2],
              addr = toxdns.decryptSync(id, info.id);
          addr.should.be.a.Buffer;
          done();
        } else done(err);
      });
    });

    it('should do stuff right (manually, async)', function(done) {
      toxdns.generate('saneki', function(err, info) {
        if(!err) {
          var full = util.format('_%s._tox.%s', info.record, 'toxme.io');
          dns.resolveTxt(full, function(err, txts) {
            if(!err) {
              var result = txts[0][0],
                  id = result.match(/(^|;)id=([a-zA-Z0-9]+)/)[2];
              toxdns.decrypt(id, info.id, function(err, addr) {
                if(!err) {
                  addr.should.be.a.Buffer;
                  done();
                } else done(err);
              });
            } else done(err);
          });
        } else done(err);
      });
    });

    it('should do stuff right', function(done) {
      toxdns.resolve('saneki@toxme.io', function(err, address) {
        if(!err) {
          address.should.be.a.Buffer;
          done();
        } else done(err);
      });
    });

    it('should do stuff right (hex)', function(done) {
      toxdns.resolveHex('saneki@toxme.io', function(err, address) {
        if(!err) {
          address.should.be.a.string;
          done();
        } else done(err);
      });
    });
  });
});
