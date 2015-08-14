var events = require('events');
var path = require('path');
var consts = require(path.join(__dirname, '..', 'consts'));

/**
 * Construct a ToxFriend.
 * @class
 * @param {ToxFriendManager} manager - Friend manager
 * @param {Number} id - Friend Id
 */
var ToxFriend = function(manager, id) {
  this._manager = manager;
  this._id = id;
  this._isRemoved = false;
  this._initialize();
  this._initEvents();
};

/**
 * Initialize the friend, setting all fields from the Tox instance.
 * @private
 */
ToxFriend.prototype._initialize = function() {
  var tox = this.tox(), id = this.id();
  if(tox.hasFriendSync(id)) {
    this._name = tox.getFriendNameSync(id);
    this._statusMessage = tox.getFriendStatusMessageSync(id);
    this._status = tox.getFriendStatusSync(id);
    this._connectionStatus = tox.getFriendConnectionStatusSync(id);
  } else {
    throw new Error('Cannot initialize friend with Id=' + id + ', friend does not exist');
  }
};

/**
 * Initialize events.
 * @private
 */
ToxFriend.prototype._initEvents = function() {
  this._emitter = new events.EventEmitter();
};

/**
 * Update some property and emit that said property was changed.
 * Only the parent ToxFriendManager should call this function.
 * @private
 * @param {String} what - Property name
 * @param {Object} e - Event object
 */
ToxFriend.prototype._changed = function(what, e) {
  if(what === 'name') {
    this._name = e.name();
  } else if(what === 'statusMessage') {
    this._statusMessage = e.statusMessage();
  } else if(what === 'status') {
    this._status = e.status();
  } else if(what === 'connectionStatus') {
    this._connectionStatus = e.connectionStatus();
  }

  this._emitter.emit(what, e);

  // Emit that a property of this user changed (unsure if this will be kept)
  this._emitter.emit('changed');
};

/**
 * Emit a 'removed' event before removing the friend from the manager.
 * Only the parent ToxFriendManager should call this function.
 * @private
 */
ToxFriend.prototype._removed = function() {
  this._isRemoved = true;
  this._emitter.emit('removed');
};

/**
 * Emit an 'added' event after adding the friend to the manager.
 * Does not apply to friends added during initialization.
 * Only the parent ToxFriendManager should call this function.
 * @private
 */
ToxFriend.prototype._added = function() {
  this._emitter.emit('added');
};

/**
 * Send an action message to this friend.
 * @param {String} action - Action to send
 * @return {Number} message id
 */
ToxFriend.prototype.action = function(action) {
  return this.tox().sendFriendMessageSync(this.id(), action, true);
};

/**
 * Get the connection status of this friend.
 * @return {Number} Connection status
 */
ToxFriend.prototype.connectionStatus = function() {
  return this._connectionStatus;
};

/**
 * Get the friend Id.
 * @return {Number} Friend Id
 */
ToxFriend.prototype.id = function() {
  return this._id;
};

/**
 * Whether or not this friend is online.
 * @return {Boolean} true if online, false if offline
 */
ToxFriend.prototype.isOnline = function() {
  return this.connectionStatus() !== consts.TOX_CONNECTION_NONE;
};

/**
 * Whether or not this friend has been removed from its parent manager.
 * @return {Boolean} true if removed, false if not
 */
ToxFriend.prototype.isRemoved = function() {
  return this._isRemoved;
};

/**
 * Get the friend name.
 * @return {String} Friend name
 */
ToxFriend.prototype.name = function() {
  return this._name;
};

/**
 * Get the parent friend manager.
 * @return {ToxFriendManager} Friend manager
 */
ToxFriend.prototype.manager = function() {
  return this._manager;
};

/**
 * Remove this friend from its parent manager.
 */
ToxFriend.prototype.remove = function() {
  this._manager.remove(this.id());
};

/**
 * Send a message to this friend.
 * @param {String} message - Message to send
 * @return {Number} message id
 */
ToxFriend.prototype.send = function(message) {
  return this.tox().sendFriendMessageSync(this.id(), message);
};

/**
 * Get the parent tox instance.
 * @return {Tox} Tox
 */
ToxFriend.prototype.tox = function() {
  return this._manager.tox();
};

module.exports = ToxFriend;
