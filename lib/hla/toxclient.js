var events = require('events');
var path = require('path');
var _ = require('underscore');
var Tox = require(path.join(__dirname, '..', 'tox'));
var ToxFriendManager = require(path.join(__dirname, 'toxfriendmanager'));
var ToxGroupManager = require(path.join(__dirname, 'toxgroupmanager'));
var consts = require(path.join(__dirname, '..', 'consts'));

var DEFAULT_NAME = 'Tox User';
var DEFAULT_STATUS_MESSAGE = 'Using node-toxcore';
var DEFAULT_STATUS = 'none';

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
    options['path'] = this.opts['path'];
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
 * Get the tox public key.
 * @return {String} Public key as a hex string (upper-case)
 */
ToxClient.prototype.publicKey = function() {
  return this._publicKey;
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
