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

var path = require('path');
var consts = require(path.join(__dirname, '..', 'consts'));

/**
 * Event object fired by {@class ToxClient}.
 * Corresponds to event {@class FriendMessageEvent}.
 * @class
 * @param {ToxFriend} friend Friend
 * @param {Number} type Message type
 * @param {String} message Message
 */
var FriendMessageClientEvent = function(friend, type, message) {
  this.type = 'FriendMessageClientEvent';
  this._friend = friend;
  this._message = message;
  this._messageType = type;
};

/**
 * Get the friend instance.
 * @return {ToxFriend} Friend
 */
FriendMessageClientEvent.prototype.friend = function() {
  return this._friend;
};

/**
 * Get the message.
 * @return {String} Message
 */
FriendMessageClientEvent.prototype.message = function() {
  return this._message;
};

/**
 * Get the message type.
 * @return {Number} Message type
 */
FriendMessageClientEvent.prototype.messageType = function() {
  return this._messageType;
};

/**
 * Whether or not the message was normal.
 * @return {Boolean} true if normal, false if not
 */
FriendMessageClientEvent.prototype.isNormal = function() {
  return this.messageType() === consts.TOX_MESSAGE_TYPE_NORMAL;
};

/**
 * Whether or not the message was an action.
 * @return {Boolean} true if action, false if not
 */
FriendMessageClientEvent.prototype.isAction = function() {
  return this.messageType() === consts.TOX_MESSAGE_TYPE_ACTION;
};

/**
 * Event object fired by {@class ToxClient}.
 * @class
 * @param {Object[]} nodes - Node objects which were successfully bootstrapped from
 * @param {Object[]} failed - Node objects which could not be bootstrapped from
 */
var BootstrapClientEvent = function(nodes, failed) {
  this.type = 'BootstrapClientEvent';
  this._nodes = nodes;
  this._failed = failed;
};

/**
 * Whether or not all nodes were successfully bootstrapped from.
 * @return {Boolean} true if all successful, false if not
 */
BootstrapClientEvent.prototype.allSuccessful = function() {
  return this.failed().length === 0;
};

/**
 * Whether or not at least one node was successfully bootstrapped from.
 * @return {Boolean} true if at least one successful, false if not
 */
BootstrapClientEvent.prototype.successful = function() {
  return this.nodes().length > 0;
};

/**
 * Get the nodes which were successfully bootstrapped from.
 * @return {Object[]} Nodes
 */
BootstrapClientEvent.prototype.nodes = function() {
  return this._nodes;
};

/**
 * Get the nodes which were not successfully bootstrapped from.
 * @return {Object[]} Nodes
 */
BootstrapClientEvent.prototype.failed = function() {
  return this._failed;
};

module.exports = {
  BootstrapClientEvent: BootstrapClientEvent,
  FriendMessageClientEvent: FriendMessageClientEvent
};
