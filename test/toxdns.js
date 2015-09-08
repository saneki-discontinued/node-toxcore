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
var should = require('should');
var util = require('util');
var path = require('path');
var ToxDns = require(path.join(__dirname, '..', 'lib', 'toxdns'));

buffertools.extend(); // Extend Buffer.prototype

describe('ToxDns', function() {
  var toxdns = new ToxDns(),
      toxdnsKilled = new ToxDns();
  toxdnsKilled.killSync();

  // This may fail if not resolved within 2 seconds
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
  });

  describe('#hasHandle()', function() {
    it('should return true when handle', function() {
      toxdns.hasHandle().should.be.true;
    });

    it('should return false when killed', function() {
      toxdnsKilled.hasHandle().should.be.false;
    });
  });
});
