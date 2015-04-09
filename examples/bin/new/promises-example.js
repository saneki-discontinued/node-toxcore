/**
 * node-toxcore (new_api) async example with bluebird promises.
 */

var async = require('async');
var Promise = require('bluebird');
var toxcore = require('toxcore').new;

Promise.promisifyAll(async);
Promise.promisifyAll(toxcore);

var tox = new toxcore.Tox();

/**
 * Bootstrap tox via hardcoded nodes.
 * For more nodes, see: https://wiki.tox.im/Nodes
 */
var bootstrap = function(callback) {
  // Define nodes to bootstrap from
  var nodes = [
    { maintainer: 'Impyy',
      address: '178.62.250.138',
      port: 33445,
      key: '788236D34978D1D5BD822F0A5BEBD2C53C64CC31CD3149350EE27D4D9A2F9B6B' },
    { maintainer: 'sonOfRa',
      address: '144.76.60.215',
      port: 33445,
      key: '04119E835DF3E78BACF0F84235B300546AF8B936F035185E2A8E9E0A67C8924F' }
  ];

  async.mapAsync(nodes, function(node, cb) {
    tox.bootstrapAsync(node.address, node.port, node.key).then(function() {
      console.log('Successfully bootstrapped from ' + node.maintainer + ' at ' + node.address + ':' + node.port);
      console.log('... with key ' + node.key);
      cb();
    }).catch(function(err) {
      console.error('Error bootstrapping from ' + node.maintainer + ':', err);
      cb(err);
    });
  }).then(function() {
    // Once all nodes have been bootstrapped from, call our callback
    callback();
  });
};

var initCallbacks = function(callback) {
  tox.on('selfConnectionStatus', function(e) {
    console.log(e.isConnected() ? 'Connected' : 'Disconnected');
  });

  tox.on('friendName', function(e) {
    console.log('Friend[' + e.friend() + '] changed their name: ' + e.name());
  });

  tox.on('friendStatusMessage', function(e) {
    console.log('Friend[' + e.friend() + '] changed their status message: ' + e.statusMessage());
  });

  tox.on('friendStatus', function(e) {
    console.log('Friend[' + e.friend() + '] changed their status: ' + e.status());
  });

  tox.on('friendConnectionStatus', function(e) {
    console.log('Friend[' + e.friend() + '] is now ' + (e.isConnected() ? 'online' : 'offline'));
  });

  tox.on('friendTyping', function(e) {
    console.log('Friend[' + e.friend() + '] is ' + (e.isTyping() ? 'typing' : 'not typing'));
  });

  tox.on('friendReadReceipt', function(e) {
    console.log('Friend[' + e.friend() + '] receipt: ' + e.receipt());
  });

  tox.on('friendRequest', function(e) {
    tox.addFriendNoRequest(e.publicKey(), function(err, friend) {
      console.log('Received friend request: ' + e.message());
      console.log('Accepted friend request from ' + e.publicKeyHex());
    });
  });

  tox.on('friendMessage', function(e) {
    if(e.isAction()) {
      console.log('** Friend[' + e.friend() + '] ' + e.message() + ' **');
    } else {
      console.log('Friend[' + e.friend() + ']: ' + e.message());
    }
    // Echo the message back
    tox.sendFriendMessageSync(e.friend(), e.message(), e.messageType());

    if(e.message() === 'typing on') {
      tox.setTyping(e.friend(), true, function(err) {
        console.log('Started typing to friend[' + e.friend() + ']');
      });
    } else if(e.message() === 'typing off') {
      tox.setTyping(e.friend(), false, function(err) {
        console.log('Stopped typing to friend[' + e.friend() + ']');
      });
    }
  });

  callback();
};

// Initialize everything + bootstrap from nodes, then when everything
// is ready, start
async.parallel([
  bootstrap,     // Bootstrap
  initCallbacks  // Initialize callbacks
], function() {
  tox.getAddressHex(function(err, address) {
    console.log('Address: ' + address);
    tox.start(); // Start
  });
});
