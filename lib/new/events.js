var path = require('path');
var consts = require(path.join(__dirname, 'consts'));

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

module.exports = {
  SelfConnectionStatusEvent: SelfConnectionStatusEvent
};
