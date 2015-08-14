var path = require('path');
var consts = require(path.join(__dirname, '..', 'consts'));

/**
 * Event object fired by {@class Tox}.
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

module.exports = {
  FriendMessageClientEvent: FriendMessageClientEvent
};
