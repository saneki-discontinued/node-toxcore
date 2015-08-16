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

var events = require('events');
var path = require('path');
var toxClientEvents = require(path.join(__dirname, 'events'));
var ToxFriend = require(path.join(__dirname, 'toxfriend'));

/**
 * Creates a ToxFriendManager instance.
 * @class
 * @param {ToxClient} client - Parent client
 */
var ToxFriendManager = function(client) {
  this._client = client;
  this._emitter = new events.EventEmitter();
  this._friends = {};
  this._count = 0;
  this._initialize();
  this._initEvents();
};

/**
 * Initialize the friend's list.
 * @private
 */
ToxFriendManager.prototype._initialize = function() {
  var manager = this,
      list = this.tox().getFriendListSync();

  list.forEach(function(num) {
    var friend = new ToxFriend(manager, num);
    manager._friends[num] = friend;
  });

  this._count = list.length;
};

/**
 * Initialize events.
 * @private
 */
ToxFriendManager.prototype._initEvents = function() {
  var manager = this,
      tox = this.tox(),
      emitter = this._emitter;

  tox.on('friendName', function(e) {
    var num = e.friend();
    var friend = manager.get(num);
    friend._changed('name', e);
    emitter.emit('name', e);
  });

  tox.on('friendStatusMessage', function(e) {
    var num = e.friend(),
        friend = manager.get(num);
    friend._changed('statusMessage', e);
    emitter.emit('statusMessage', e);
  });

  tox.on('friendStatus', function(e) {
    var num = e.friend(),
        friend = manager.get(num);
    friend._changed('status', e);
    emitter.emit('status', e);
  });

  tox.on('friendConnectionStatus', function(e) {
    var num = e.friend(),
        friend = manager.get(num);
    friend._changed('connectionStatus', e);
    emitter.emit('connectionStatus', e);
  });

  tox.on('friendRequest', function(e) {
    emitter.emit('request', e);
  });

  tox.on('friendMessage', function(e) {
    emitter.emit('message', new toxClientEvents.FriendMessageClientEvent(
      manager.get(e.friend()), e.messageType(), e.message()
    ));
  });
};

/**
 * Add a friend.
 * @param {(Buffer|String)} address - Address to add
 * @param {(Buffer|String)} [message] - Message to send
 * @return {ToxFriend} friend
 */
ToxFriendManager.prototype.add = function(address, message) {
  var num = this.tox().addFriendSync(address, message),
      friend = new ToxFriend(this, num);
  return this._add(num, friend);
};

/**
 * Add a friend without sending a friend request.
 * @param {(Buffer|String)} address - Address to add
 * @return {ToxFriend} friend
 */
ToxFriendManager.prototype.addNoRequest = function(address) {
  var num = this.tox().addFriendNoRequestSync(address),
      friend = new ToxFriend(this, num);
  return this._add(num, friend);
};

/**
 * Helper method for add/addNoRequest.
 * @private
 * @param {Number} num
 * @param {ToxFriend} friend
 * @return {ToxFriendManager} this
 */
ToxFriendManager.prototype._add = function(num, friend) {
  this._friends[num] = friend;
  friend._added(); // Emit ToxFriend 'added' event (no point to this?)
  this._count += 1;
  return this;
};

/**
 * Get the parent client.
 * @return {ToxClient} Client
 */
ToxFriendManager.prototype.client = function() {
  return this._client;
};

/**
 * Check whether or not a friend exists with a specific friend Id.
 * @param {Number} id - Friend Id to check for
 * @return {Boolean} true if exists, false if not found
 */
ToxFriendManager.prototype.has = function(id) {
  return this._friends[id] !== undefined;
};

/**
 * Wrapper method for _emitter.on.
 */
ToxFriendManager.prototype.on = function(name, callback) {
  this._emitter.on(name, callback);
};

/**
 * Remove a friend.
 * @param {(Number|ToxFriend)} id - Id of friend to remove, or ToxFriend instance
 * @return {ToxFriendManager} this
 */
ToxFriendManager.prototype.remove = function(id) {
  if(id instanceof ToxFriend) {
    id = id.id();
  }

  var friend = this._friends[id];
  if(friend) {
    friend._removed(); // Emit ToxFriend 'removed' event
    this._count -= 1;
  }

  this._friends[id] = undefined;
  return this;
};

/**
 * Get the friend count.
 * @return {Number} Friend count
 */
ToxFriendManager.prototype.count = function() {
  return this._count;
};

/**
 * Get a friend by Id.
 * @param {Number} id - Friend Id
 * @return {ToxFriend} Friend, or undefined if none
 */
ToxFriendManager.prototype.get = function(id) {
  if(this._friends[id] !== undefined) {
    return this._friends[id];
  }
};

/**
 * Get the Tox instance.
 * @return {Tox} Tox
 */
ToxFriendManager.prototype.tox = function() {
  return this.client().tox();
};

module.exports = ToxFriendManager;
