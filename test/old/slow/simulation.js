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
var toxcore = require(path.join(__dirname, '..', '..', 'lib', 'main'));

var debug = function() { console.log.apply(console, arguments); };

// This doesn't seem to work well if another tox instance is running and
// using UDP port 33445.
describe('simulation (sync) @slow', function() {
  var primary = new toxcore.Tox(),
      secondary = new toxcore.Tox(),
      toxs = [primary, secondary];

  // Setup tox instances as friends and make sure they can communicate
  // before running any tests
  before(function(done) {
    // Set names, status messages
    primary.setNameSync('Tox Simulation Instance 1');
    primary.setStatusMessageSync('Sim 1');
    secondary.setNameSync('Tox Simulation Instance 2');
    secondary.setStatusMessageSync('Sim 2');

    (function(tox) {
      tox.on('connectionStatus', function(e) {
        debug('Received connection status ' + e.friend() + ': ' + e.isConnected());
        if(e.isConnected()) {
          tox.getEmitter().removeAllListeners();
          var receipt = tox.sendMessageSync(e.friend(), 'init');
          debug('Sent init message with receipt ' + receipt);
        }
      });
    })(primary);

    (function(tox) {
      tox.on('friendRequest', function(e) {
        debug('Received friend request');
        var friendnum = tox.addFriendNoRequestSync(e.publicKey());
        debug('Accepted friend request ' + friendnum + ': ' + e.publicKeyHex());
      });

      tox.on('friendMessage', function(e) {
        debug('Received friend message: ' + e.message());
        if(e.message() === 'init') {
          tox.getEmitter().removeAllListeners();
          done();
        }
      });
    })(secondary);

    primary.addFriendSync(secondary.getAddressSync(), 'hello');

    // Start each
    toxs.forEach(function(tox) {
      tox.start();
    });

    debug('Awaiting communication between tox instances');
  });

  it('setup succeeded', function() {
  });
});
