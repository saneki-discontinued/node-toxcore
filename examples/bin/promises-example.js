/**
 * node-toxcore async example with bluebird promises.
 */

var async = require('async');
var Promise = require('bluebird');
var toxcore = require('toxcore');

Promise.promisifyAll(async);
Promise.promisifyAll(toxcore);

/**
 * node-toxcore example with bluebird promises.
 * @class
 */
var PromisesExample = function() {
  var tox = this._tox = new toxcore.Tox();

  var initSelf = PromisesExample.prototype._initSelf.bind(this),
      initCallbacks = PromisesExample.prototype._initCallbacks.bind(this),
      bootstrap = PromisesExample.prototype.bootstrap.bind(this);

  async.parallel([
    initSelf,      // Initialize name, status message
    initCallbacks, // Initialize callbacks
    bootstrap      // Bootstrap
  ], function() {
    // When everything is ready, print out our tox address
    tox.getAddressHexAsync().then(function(addr) {
      console.log('------------------------');
      console.log('Tox address: ' + addr);
    });
  });
};

/**
 * Bootstrap tox via hardcoded nodes.
 * For more nodes, see: https://wiki.tox.im/Nodes
 */
PromisesExample.prototype.bootstrap = function(callback) {
  var tox = this.getTox();

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
 * Get our Tox instance.
 * @return {toxcore.Tox} Tox instance
 */
PromisesExample.prototype.getTox = function() {
  return this._tox;
};

/**
 * Initialize ourself. Sets name and status message.
 * @private
 */
PromisesExample.prototype._initSelf = function(callback) {
  var tox = this.getTox();

  // Asynchronously set our name and status message using promises
  Promise.join(
    tox.setNameAsync('Bluebird'),
    tox.setStatusMessageAsync('Some status message')
  ).then(function() {
    console.log('Successfully set name and status message!');
    callback();
  }).catch(function(err) {
    console.error('Error (_initSelf):', err);
    callback(err);
  });
};

/**
 * Initialize our callbacks, listening for friend requests and messages.
 */
PromisesExample.prototype._initCallbacks = function(callback) {
  var tox = this.getTox();

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
    tox.sendMessageAsync(evt.message(), evt.friend()).then(function(receipt) {
      console.log('Echoed message back to friend, received receipt ' + receipt);
    }).catch(function(err) {
      console.error('Couldn\'t echo message back to friend:', err);
    });
  });

  callback();
};

(new PromisesExample()).getTox().start();
