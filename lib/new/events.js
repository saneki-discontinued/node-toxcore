var buffertools = require('buffertools');
var path = require('path');
var consts = require(path.join(__dirname, 'consts'));

buffertools.extend();

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_self_connection_status(3).
 * @class
 * @param {Number} connectionStatus Connection status
 */
var SelfConnectionStatusEvent = function(connectionStatus) {
  this.type = 'SelfConnectionStatusEvent';
  this._connectionStatus = connectionStatus;
};

/**
 * Get the connection status.
 * @return {Number} Connection status value
 */
SelfConnectionStatusEvent.prototype.connectionStatus = function() {
  return this._connectionStatus;
};

/**
 * Get whether or not the connection status indicates we are connected.
 * @return {Boolean} true if connected, false if not
 */
SelfConnectionStatusEvent.prototype.isConnected = function() {
  return this.connectionStatus() !== consts.TOX_CONNECTION_NONE;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_friend_name(3).
 * @class
 * @param {Number} friendnum Friend number
 * @param {String} name New name
 */
var FriendNameEvent = function(friendnum, name) {
  this.type = 'FriendNameEvent';
  this._friendnum = friendnum;
  this._name = name;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FriendNameEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the new name.
 * @return {String} New name
 */
FriendNameEvent.prototype.name = function() {
  return this._name;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_friend_status_message(3).
 * @class
 * @param {Number} friendnum Friend number
 * @param {String} statusMessage New status message
 */
var FriendStatusMessageEvent = function(friendnum, statusMessage) {
  this.type = 'FriendStatusMessageEvent';
  this._friendnum = friendnum;
  this._statusMessage = statusMessage;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FriendStatusMessageEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the new status message.
 * @return {String} New status message
 */
FriendStatusMessageEvent.prototype.statusMessage = function() {
  return this._statusMessage;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_friend_status(3).
 * @class
 * @param {Number} friendnum Friend number
 * @param {Number} status New status
 */
var FriendStatusEvent = function(friendnum, status) {
  this.type = 'FriendStatusEvent';
  this._friendnum = friendnum;
  this._status = status;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FriendStatusEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the new status.
 * @return {Number} New status
 */
FriendStatusEvent.prototype.status = function() {
  return this._status;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_friend_connection_status(3).
 * @class
 * @param {Number} friendnum Friend number
 * @param {Number} connectionStatus New connection status
 */
var FriendConnectionStatusEvent = function(friendnum, connectionStatus) {
  this.type = 'FriendStatusEvent';
  this._friendnum = friendnum;
  this._connectionStatus = connectionStatus;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FriendConnectionStatusEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the new connection status value.
 * @return {Number} New connection status value
 */
FriendConnectionStatusEvent.prototype.connectionStatus = function() {
  return this._connectionStatus;
};

/**
 * Get whether or not this friend has connected.
 * @return {Boolean} true if connected, false if not
 */
FriendConnectionStatusEvent.prototype.isConnected = function() {
  return this.connectionStatus() !== consts.TOX_CONNECTION_NONE;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_friend_typing(3).
 * @class
 * @param {Number} friendnum Friend number
 * @param {Boolean} typing Typing
 */
var FriendTypingEvent = function(friendnum, typing) {
  this.type = 'FriendTypingEvent';
  this._friendnum = friendnum;
  this._typing = typing;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FriendTypingEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get whether or not this friend is typing.
 * @return {Boolean} true if typing, false if not
 */
FriendTypingEvent.prototype.isTyping = function() {
  return this._typing;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_friend_read_receipt(3).
 * @class
 * @param {Number} friendnum Friend number
 * @param {Number} receipt Receipt
 */
var FriendReadReceiptEvent = function(friendnum, receipt) {
  this.type = 'ReadReceiptEvent';
  this._friendnum = friendnum;
  this._receipt = receipt;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FriendReadReceiptEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the receipt.
 * @return {Number} Receipt
 */
FriendReadReceiptEvent.prototype.receipt = function() {
  return this._receipt;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_friend_request(3).
 * @class
 * @param {Buffer} publicKey Public key of requester
 * @param {String} message Message sent along with the request
 */
var FriendRequestEvent = function(publicKey, message) {
  this.type = 'FriendRequestEvent';
  this._publicKey = publicKey;
  this._message = message;
};

/**
 * Get the public key.
 * @return {Buffer} Public key
 */
FriendRequestEvent.prototype.publicKey = function() {
  return this._publicKey;
};

/**
 * Get the public key as a hex String.
 * @return {String} Public key as a hex String
 */
FriendRequestEvent.prototype.publicKeyHex = function() {
  return this._publicKey.toHex().toString();
};

/**
 * Get the message.
 * @return {String} Message
 */
FriendRequestEvent.prototype.message = function() {
  return this._message;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_friend_message(3).
 * @class
 * @param {Number} friendnum Friend number
 * @param {Number} type Message type
 * @param {String} message Message
 */
var FriendMessageEvent = function(friendnum, type, message) {
  this.type = 'FriendMessageEvent';
  this._friendnum = friendnum;
  this._message = message;
  this._messageType = type;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FriendMessageEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the message.
 * @return {String} Message
 */
FriendMessageEvent.prototype.message = function() {
  return this._message;
};

/**
 * Get the message type.
 * @return {Number} Message type
 */
FriendMessageEvent.prototype.messageType = function() {
  return this._messageType;
};

/**
 * Whether or not the message was normal.
 * @return {Boolean} true if normal, false if not
 */
FriendMessageEvent.prototype.isNormal = function() {
  return this.messageType() === consts.TOX_MESSAGE_TYPE_NORMAL;
};

/**
 * Whether or not the message was an action.
 * @return {Boolean} true if action, false if not
 */
FriendMessageEvent.prototype.isAction = function() {
  return this.messageType() === consts.TOX_MESSAGE_TYPE_ACTION;
};

module.exports = {
  SelfConnectionStatusEvent: SelfConnectionStatusEvent,
  FriendNameEvent: FriendNameEvent,
  FriendStatusMessageEvent: FriendStatusMessageEvent,
  FriendStatusEvent: FriendStatusEvent,
  FriendConnectionStatusEvent: FriendConnectionStatusEvent,
  FriendTypingEvent: FriendTypingEvent,
  FriendReadReceiptEvent: FriendReadReceiptEvent,
  FriendRequestEvent: FriendRequestEvent,
  FriendMessageEvent: FriendMessageEvent
};
