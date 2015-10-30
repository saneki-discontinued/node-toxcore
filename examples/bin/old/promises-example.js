/**
 * @file promises-example.js - node-toxcore async example with bluebird
 * promises.
 *
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

var async = require('async');
var Promise = require('bluebird');
var toxcore = require('toxcore');

Promise.promisifyAll(async);
Promise.promisifyAll(toxcore);

var tox = new toxcore.Tox();

var groupchats = {
  'text': -1,
  'av': -1
};

/**
 * Bootstrap tox via hardcoded nodes.
 * For more nodes, see: https://wiki.tox.chat/users/nodes
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
    tox.bootstrapFromAddressAsync(node.address, node.port, node.key).then(function() {
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

/**
 * Initialize ourself. Sets name and status message.
 * @private
 */
var initSelf = function(callback) {
  // Asynchronously set our name and status message using promises
  Promise.join(
    tox.setNameAsync('Bluebird'),
    tox.setStatusMessageAsync('Some status message')
  ).then(function() {
    console.log('Successfully set name and status message!');
    callback();
  }).catch(function(err) {
    console.error('Error (initSelf):', err);
    callback(err);
  });
};

/**
 * Initialize our callbacks, listening for friend requests and messages.
 */
var initCallbacks = function(callback) {
  tox.on('friendRequest', function(evt) {
    console.log('Accepting friend request from ' + evt.publicKeyHex());
    // Automatically accept the request
    tox.addFriendNoRequestAsync(evt.publicKey()).then(function() {
      console.log('Successfully accepted the friend request!');
    }).catch(function(err) {
      console.error('Couldn\'t accept the friend request:', err);
    });
  });

  tox.on('friendMessage', function(evt) {
    console.log('Message from friend ' + evt.friend() + ': ' + evt.message());
    // Echo message back to friend
    tox.sendMessageAsync(evt.friend(), evt.message()).then(function(receipt) {
      console.log('Echoed message back to friend, received receipt ' + receipt);
    }).catch(function(err) {
      console.error('Couldn\'t echo message back to friend:', err);
    });
  });

  // Setup friendMessage callback to listen for groupchat invite requests
  tox.on('friendMessage', function(evt) {
    if(evt.message() === 'invite text') {
      tox.inviteAsync(evt.friend(), groupchats['text']).then(function() {
        console.log('Invited ' + evt.friend() + ' to the text groupchat');
      });
    } else if(evt.message() === 'invite av') {
      tox.inviteAsync(evt.friend(), groupchats['av']).then(function() {
        console.log('Invited ' + evt.friend() + ' to the audio/video groupchat');
      });
    }
  });

  callback();
};

/**
 * Initialize the groupchats, and call the callback when finished.
 */
var initGroupchats = function(callback) {
  async.parallelAsync([
    tox.addGroupchat.bind(tox),
    tox.getAV().addGroupchat.bind(tox.getAV())
  ]).then(function(results) {
    groupchats['text'] = results[0];
    groupchats['av'] = results[1];
  }).finally(callback);
};

// Initialize everything + bootstrap from nodes, then when everything
// is ready print our address and start
async.parallel([
  initSelf,       // Initialize name, status message
  initCallbacks,  // Initialize callbacks
  initGroupchats, // Initialize groupchats
  bootstrap       // Bootstrap
], function() {
  // When everything is ready, print out our tox address
  tox.getAddressHexAsync().then(function(addr) {
    console.log('------------------------');
    console.log('Tox address: ' + addr);
  });

  tox.start(); // Start
});
