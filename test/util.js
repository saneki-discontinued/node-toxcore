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
