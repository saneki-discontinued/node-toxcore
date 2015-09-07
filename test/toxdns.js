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
var should = require('should');
var path = require('path');
var ToxDns = require(path.join(__dirname, '..', 'lib', 'toxdns'));

buffertools.extend(); // Extend Buffer.prototype

describe('ToxDns', function() {
  var toxdns = new ToxDns(),
      toxdnsKilled = new ToxDns();
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
