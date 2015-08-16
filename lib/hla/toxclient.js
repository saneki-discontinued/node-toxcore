var buffer = require('buffer');
var events = require('events');
var path = require('path');
var _ = require('underscore');
var Tox = require(path.join(__dirname, '..', 'tox'));
var ToxFriendManager = require(path.join(__dirname, 'toxfriendmanager'));
var ToxGroupManager = require(path.join(__dirname, 'toxgroupmanager'));
var toxClientEvents = require(path.join(__dirname, 'events'));
var consts = require(path.join(__dirname, '..', 'consts'));

var DEFAULT_NAME = 'Tox User';
var DEFAULT_STATUS_MESSAGE = 'Using node-toxcore';
var DEFAULT_STATUS = 'none';
var DEFAULT_BOOTSTRAP_PORT = 33445;

/**
 * Creates a ToxClient instance.
 * @class
 * @param {Object} [opts] - Options
 */
var ToxClient = function(opts) {
  if(!_.isObject(opts)) {
    opts = {};
  }

  var name = (opts['name'] !== undefined ? opts['name'] : DEFAULT_NAME),
      statusMessage = (opts['statusMessage'] !== undefined ? opts['statusMessage'] : DEFAULT_STATUS_MESSAGE),
      status = (opts['status'] !== undefined ? opts['status'] : DEFAULT_STATUS),
      nodes = (opts['nodes'] !== undefined ? opts['nodes'] : []);

  this._initTox(opts);
  this._updateAddress();

  this._publicKey = this.tox().getPublicKeyHexSync().toUpperCase();
  this._secretKey = this.tox().getSecretKeyHexSync().toUpperCase();
  this._bootstrapped = false;

  this.name(name);
  this.statusMessage(statusMessage);
  this.status(status);
  this._nodes = nodes;

  this._initFriends();
  this._initGroups();
  this._initEvents();
};

/**
 * Initialize the Tox instance.
 * @param {Object} opts - Options
 */
ToxClient.prototype._initTox = function(opts) {
  var options = {};

  if(!opts) {
    opts = {};
  }

  if(_.isString(opts['path'])) {
    options['path'] = opts['path'];
  }

  if(_.isString(opts['data']) || buffer.Buffer.isBuffer(opts['data'])) {
    options['data'] = opts['data'];
  }

  this._tox = new Tox(opts);
};

/**
 * Initialize events.
 * @private
 */
ToxClient.prototype._initEvents = function() {
  var emitter = this._emitter = new events.EventEmitter();

  this.friends().on('request', function(e) {
    emitter.emit('request', e);
  });

  this.friends().on('message', function(e) {
    emitter.emit('message', e);
  });

  this.tox().on('selfConnectionStatus', function(e) {
    emitter.emit('connect', e);
  });
};

/**
 * Initialize the friend manager.
 */
ToxClient.prototype._initFriends = function() {
  this._friends = new ToxFriendManager(this);
};

/**
 * Initialize the groupchat manager.
 */
ToxClient.prototype._initGroups = function() {
  this._groups = new ToxGroupManager(this);
};

/**
 * Translate a status string to a status value (number).
 * @private
 * @param {String} statusStr - Status string, expects one of
 *                             ['none', 'away', 'busy'] (case-insensitive)
 * @return {Number} Status value
 */
ToxClient.prototype._toStatusValue = function(statusStr) {
  if(/^none$/i.test(statusStr)) {
    return consts.TOX_USER_STATUS_NONE;
  } else if(/^away$/i.test(statusStr)) {
    return consts.TOX_USER_STATUS_AWAY;
  } else if(/^busy$/i.test(statusStr)) {
    return consts.TOX_USER_STATUS_BUSY;
  }
};

/**
 * Translate a status value (number) to a status string.
 * @private
 * @param {Number} statusValue - Numeric status value to translate
 * @return {String} Status string
 */
ToxClient.prototype._toStatusString = function(statusValue) {
  if(statusValue === consts.TOX_USER_STATUS_NONE) {
    return 'none';
  } else if(statusValue === consts.TOX_USER_STATUS_AWAY) {
    return 'away';
  } else if(statusValue === consts.TOX_USER_STATUS_BUSY) {
    return 'busy';
  }
};

/**
 * Update the _address property.
 * @private
 */
ToxClient.prototype._updateAddress = function() {
  this._address = this.tox().getAddressHexSync().toUpperCase();
};

/**
 * Get the tox address.
 * @return {String} Address as a hex string (upper-case)
 */
ToxClient.prototype.address = function() {
  return this._address;
};

/**
 * "Fix" a bootstrap node object. Currently this only tries
 * to fix the port, assigning the default port if none set.
 * @private
 * @param {Object} node - Node object
 */
ToxClient.prototype._fixBootstrapNode = function(node) {
  // If port is a number string, parse it
  if(_.isString(node.port) && !isNaN(node.port)) {
    node.port = Integer.parseInt(node.port);
  }

  // If still no port set, use default
  if(!_.isNumber(node.port)) {
    node.port = DEFAULT_BOOTSTRAP_PORT;
  }
};

/**
 * Check whether or not an object appears to be a bootstrap node.
 * Sets the port to default if not found (or is a string).
 * @param {Object} node - Node object to check
 * @return {Boolean} true if a node object, false if not
 */
ToxClient.prototype._isBootstrapNode = function(node) {
  this._fixBootstrapNode(node);
  return _.isObject(node)
    && _.isString(node.address)
    && _.isString(node.key)
    && _.isNumber(node.port);
};

/**
 * @private
 * @param {Object[]} nodes - All nodes
 * @return {Object} Object with obj.good => array of good nodes,
 *                  obj.bad => array of bad nodes
 */
ToxClient.prototype._filterBootstrapNodes = function(nodes) {
  var goodNodes = [], badNodes = [],
      check = ToxClient.prototype._isBootstrapNode.bind(this);

  nodes.forEach(function(node) {
    if(check(node)) {
      goodNodes.push(node);
    } else {
      badNodes.push(node);
    }
  });

  return { good: goodNodes, bad: badNodes };
};

/**
 * Bootstrap from an array of node objects.
 * @param {Object[]} nodes - Node objects
 */
ToxClient.prototype.bootstrap = function(nodes) {
  var tox = this.tox(),
      filteredNodes = this._filterBootstrapNodes(nodes),
      goodNodes = filteredNodes.good, badNodes = filteredNodes.bad;

  if(badNodes.length > 0) {
    throw new Error('Invalid nodes');
  }

  if(goodNodes.length === 0) {
    throw new Error('No nodes to bootstrap from');
  }

  var successfulNodes = [], failedNodes = [];
  goodNodes.forEach(function(node) {
    try {
      tox.bootstrapSync(node.address, node.port, node.key);
    } catch(err) {
      failedNodes.push(node);
      return;
    }
    successfulNodes.push(node);
  });

  // Indicate that at least one node was successfully bootstrapped against
  if(successfulNodes.length > 0) {
    this._bootstrapped = true;
  }

  this._emitter.emit(
    'bootstrap',
    new toxClientEvents.BootstrapClientEvent(successfulNodes, failedNodes)
  );
};

/**
 * Get the tox public key.
 * @return {String} Public key as a hex string (upper-case)
 */
ToxClient.prototype.publicKey = function() {
  return this._publicKey;
};

/**
 * Gets the tox savedata.
 * @return {Buffer} Savedata buffer
 */
ToxClient.prototype.savedata = function() {
  return this.tox().getSavedataSync();
};

/**
 * Get the tox secret key.
 * @return {String} Secret key as a hex string (upper-case)
 */
ToxClient.prototype.secretKey = function() {
  return this._secretKey;
};

/**
 * Get the friend manager.
 * @return {ToxFriendManager} Friend manager
 */
ToxClient.prototype.friends = function() {
  return this._friends;
};

/**
 * Get a friend by Id.
 * @param {Number} id - Friend Id
 */
ToxClient.prototype.friend = function(id) {
  return this.friends().get(id);
};

/**
 * Get the group manager.
 * @return {ToxGroupManager} Groupchat manager
 */
ToxClient.prototype.groups = function() {
  return this._groups;
};

/**
 * Get or set this client's name.
 * @param {String} [newName] - New name to set, if any
 * @return {String} Name
 */
ToxClient.prototype.name = function(newName) {
  if(arguments.length > 0) {
    this.tox().setNameSync(newName);
    this._name = this.tox().getNameSync();
  }
  return this._name;
};

/**
 * Get or set this client's status message.
 * @param {String} [newStatusMessage] - New status message to set, if any
 * @return {String} Status message
 */
ToxClient.prototype.statusMessage = function(newStatusMessage) {
  if(arguments.length > 0) {
    this.tox().setStatusMessageSync(newStatusMessage);
    this._statusMessage = this.tox().getStatusMessageSync();
  }
  return this._statusMessage;
};

/**
 * Get or set this client's status.
 * @param {(Number|String)} [newStatus] - New status to set, if any
 * @return {String} String representation (lower-case) of status, which should
 *                  be one of ['none', 'away', 'busy'].
 */
ToxClient.prototype.status = function(newStatus) {
  if(arguments.length > 0) {
    if(_.isString(newStatus)) {
      newStatus = this._toStatusValue(newStatus);
    }
    this.tox().setStatusSync(newStatus);
    this._status = this._toStatusString(this.tox().getStatusSync());
  }
  return this._status;
};

/**
 * Wrapper method for _emitter.on.
 */
ToxClient.prototype.on = function(name, callback) {
  this._emitter.on(name, callback);
};

/**
 * Start the client.
 */
ToxClient.prototype.start = function() {
  // Try to bootstrap if we haven't already
  if(!this._bootstrapped) {
    if(this._nodes.length > 0) {
      this.bootstrap(this._nodes);
    } else {
      console.warn('Starting without bootstrapping');
    }
  }

  this.tox().start();
};

/**
 * Get the Tox instance.
 * @return {Tox} Tox
 */
ToxClient.prototype.tox = function() {
  return this._tox;
};

module.exports = ToxClient;
