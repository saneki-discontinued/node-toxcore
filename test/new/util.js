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
var util = require(path.join(__dirname, '..', '..', 'lib', 'new', 'util'));
var size_t = util.size_t;

buffertools.extend(); // Extend Buffer.prototype

describe('util', function() {
  describe('#size_t()', function() {
    it('should return a Buffer', function() {
      var zeroSize = size_t(0);
      should.exist(zeroSize);
    });
  });
});
