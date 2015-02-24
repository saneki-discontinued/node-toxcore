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
