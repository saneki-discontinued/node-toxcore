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

  callback();
};

// Initialize everything + bootstrap from nodes, then when everything
// is ready, start
async.parallel([
  bootstrap,     // Bootstrap
  initCallbacks  // Initialize callbacks
], function() {
  tox.start(); // Start
});
