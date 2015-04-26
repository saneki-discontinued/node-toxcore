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
  this.type = 'FriendConnectionStatusEvent';
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
  this.type = 'FriendReadReceiptEvent';
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

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_file_recv_control(3).
 * @class
 * @param {Number} friendnum - Friend number
 * @param {Number} filenum - File number
 * @param {Number} control - TOX_FILE_CONTROL type
 */
var FileRecvControlEvent = function(friendnum, filenum, control) {
  this.type = 'FileRecvControlEvent';
  this._friendnum = friendnum;
  this._filenum = filenum;
  this._control = control;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FileRecvControlEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the file number.
 * @return {Number} File number
 */
FileRecvControlEvent.prototype.file = function() {
  return this._filenum;
};

/**
 * Get the control type.
 * @return {Number} Control
 */
FileRecvControlEvent.prototype.control = function() {
  return this._control;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_file_chunk_request(3).
 * @class
 * @param {Number} friendnum - Friend number
 * @param {Number} filenum - File number
 * @param {Number} position - Position
 * @param {Number} length - Chunk size
 * @note position is a uint64_t, length is a size_t
 */
var FileChunkRequestEvent = function(friendnum, filenum, position, length) {
  this.type = 'FileChunkRequestEvent';
  this._friendnum = friendnum;
  this._filenum = filenum;
  this._position = position;
  this._length = length;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FileChunkRequestEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the file number.
 * @return {Number} File number
 */
FileChunkRequestEvent.prototype.file = function() {
  return this._filenum;
};

/**
 * Get the position.
 * @return {Number} Position
 */
FileChunkRequestEvent.prototype.position = function() {
  return this._position;
};

/**
 * Get the length (chunk size).
 * @return {Number} Length
 */
FileChunkRequestEvent.prototype.length = function() {
  return this._length;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_file_recv(3).
 * @class
 * @param {Number} friendnum - Friend number
 * @param {Number} filenum - File number
 * @param {Number} kind - File kind
 * @param {Number} size - File size
 * @param {String} filename - Filename
 * @note size is a uint64_t
 */
var FileRecvEvent = function(friendnum, filenum, kind, size, filename) {
  this.type = 'FileRecvEvent';
  this._friendnum = friendnum;
  this._filenum = filenum;
  this._kind = kind;
  this._size = size;
  this._filename = filename;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FileRecvEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the file number.
 * @return {Number} File number
 */
FileRecvEvent.prototype.file = function() {
  return this._filenum;
};

/**
 * Get the file kind.
 * @return {Number} Kind
 */
FileRecvEvent.prototype.kind = function() {
  return this._kind;
};

/**
 * Get the file size.
 * @return {Number} Size
 */
FileRecvEvent.prototype.size = function() {
  return this._size;
};

/**
 * Get the filename.
 * @return {Number} Filename
 */
FileRecvEvent.prototype.filename = function() {
  return this._filename;
};

/**
 * Event object fired by {@class Tox}.
 * Corresponds to tox_callback_file_recv_chunk(3).
 * @class
 * @param {Number} friendnum - Friend number
 * @param {Number} filenum - File number
 * @param {Number} position - Position
 * @param {Buffer} data - Chunk data
 * @note size is a uint64_t
 */
var FileRecvChunkEvent = function(friendnum, filenum, position, data) {
  this.type = 'FileRecvChunkEvent';
  this._friendnum = friendnum;
  this._filenum = filenum;
  this._position = position;
  this._data = data;
};

/**
 * Get the friend number.
 * @return {Number} Friend number
 */
FileRecvChunkEvent.prototype.friend = function() {
  return this._friendnum;
};

/**
 * Get the file number.
 * @return {Number} File number
 */
FileRecvChunkEvent.prototype.file = function() {
  return this._filenum;
};

/**
 * Get the position.
 * @return {Number} Position
 */
FileRecvChunkEvent.prototype.position = function() {
  return this._position;
};

/**
 * Get the chunk data.
 * @return {Buffer} Data
 */
FileRecvChunkEvent.prototype.data = function() {
  return this._data;
};

/**
 * Get the chunk length. If no received chunk (NULL), will return 0.
 * @return {Number} Chunk length
 */
FileRecvChunkEvent.prototype.length = function() {
  return (this.isNull() ? 0 : this.data().length);
};

/**
 * Checks if this is the final chunk (if length is 0).
 * @return {Boolean} true if final chunk, false if not
 */
FileRecvChunkEvent.prototype.isFinal = function() {
  return this.length() === 0;
};

/**
 * Whether or not the data buffer is undefined, which means the Buffer
 * from the tox callback pointed to 0 (NULL). This should only happen
 * on the final chunk with a length of 0?
 * @return {Boolean} true if null, false if not
 */
FileRecvChunkEvent.prototype.isNull = function() {
  return this.data() === undefined;
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
  FriendMessageEvent: FriendMessageEvent,
  FileRecvControlEvent: FileRecvControlEvent,
  FileChunkRequestEvent: FileChunkRequestEvent,
  FileRecvEvent: FileRecvEvent,
  FileRecvChunkEvent: FileRecvChunkEvent
};
