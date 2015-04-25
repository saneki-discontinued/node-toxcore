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

/**
 * @file errors.js - Provides functions for handling errors and error values.
 * @todo Remove check* function, rename almost all
 */

var path = require('path');
var consts = require(path.join(__dirname, 'consts'));

module.exports = {
  /**
   * Check the error value that may have been set by tox_new, and throw
   * the corresponding error (if any).
   * @private
   * @param {Number} val - Error value to check
   * @todo Get an Error instead of throw
   */
  checkToxNewError: function(val) {
    if(val !== consts.TOX_ERR_NEW_OK) {
      throw (new Error('tox_new error: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_BOOTSTRAP value. If none,
   * will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_BOOTSTRAP value
   * @return {Error} Error, if any
   */
  bootstrap: function(val) {
    if(val !== consts.TOX_ERR_BOOTSTRAP_OK) {
      return (new Error('tox_bootstrap: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FILE_CONTROL value.
   * @private
   */
  fileControl: function(val) {
    if(val !== consts.TOX_ERR_FILE_CONTROL_OK) {
      return (new Error('TOX_ERR_FILE_CONTROL: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FILE_SEEK value.
   * @private
   */
  fileSeek: function(val) {
    if(val !== consts.TOX_ERR_FILE_SEEK_OK) {
      return (new Error('TOX_ERR_FILE_SEEK: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FILE_GET value.
   * @private
   */
  fileGet: function(val) {
    if(val !== consts.TOX_ERR_FILE_GET_OK) {
      return (new Error('TOX_ERR_FILE_GET: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FILE_SEND value.
   * @private
   */
  fileSend: function(val) {
    if(val !== consts.TOX_ERR_FILE_SEND_OK) {
      return (new Error('TOX_ERR_FILE_SEND: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FILE_SEND_CHUNK value.
   * @private
   */
  fileSendChunk: function(val) {
    if(val !== consts.TOX_ERR_FILE_SEND_CHUNK_OK) {
      return (new Error('TOX_ERR_FILE_SEND_CHUNK: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FRIEND_ADD value.
   * If none, will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_FRIEND_ADD value
   * @return {Error} Error, if any
   */
  friendAdd: function(val) {
    if(val !== consts.TOX_ERR_FRIEND_ADD_OK) {
      return (new Error('TOX_ERR_FRIEND_ADD: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FRIEND_BY_PUBLIC_KEY value.
   * If none, will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_FRIEND_BY_PUBLIC_KEY value
   * @return {Error} Error, if any
   */
  friendByPublicKey: function(val) {
    if(val !== consts.TOX_ERR_FRIEND_BY_PUBLIC_KEY_OK) {
      return (new Error('TOX_ERR_FRIEND_BY_PUBLIC_KEY: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FRIEND_DELETE value.
   * @private
   */
  friendDelete: function(val) {
    if(val !== consts.TOX_ERR_FRIEND_DELETE_OK) {
      return (new Error('TOX_ERR_FRIEND_DELETE: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FRIEND_GET_LAST_ONLINE
   * value.
   * @private
   */
  friendGetLastOnline: function(val) {
    if(val !== consts.TOX_ERR_FRIEND_GET_LAST_ONLINE_OK) {
      return (new Error('TOX_ERR_FRIEND_GET_LAST_ONLINE: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FRIEND_GET_PUBLIC_KEY value.
   * If none, will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_FRIEND_GET_PUBLIC_KEY value
   * @return {Error} Error, if any
   */
  friendGetPublicKey: function(val) {
    if(val !== consts.TOX_ERR_FRIEND_GET_PUBLIC_KEY_OK) {
      return (new Error('TOX_ERR_FRIEND_GET_PUBLIC_KEY: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FRIEND_CUSTOM_PACKET value.
   * If none, will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_FRIEND_CUSTOM_PACKET value
   * @return {Error} Error, if any
   */
  friendCustomPacket: function(val) {
    if(val !== consts.TOX_ERR_FRIEND_CUSTOM_PACKET_OK) {
      return (new Error('TOX_ERR_FRIEND_CUSTOM_PACKET: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FRIEND_QUERY value.
   * If none, will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_FRIEND_QUERY value
   * @return {Error} Error, if any
   */
  friendQuery: function(val) {
    if(val !== consts.TOX_ERR_FRIEND_QUERY_OK) {
      return (new Error('TOX_ERR_FRIEND_QUERY: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_FRIEND_SEND_MESSAGE value.
   * If none, will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_FRIEND_SEND_MESSAGE value
   * @return {Error} Error, if any
   */
  friendSendMessage: function(val) {
    if(val !== consts.TOX_ERR_FRIEND_SEND_MESSAGE_OK) {
      return (new Error('TOX_ERR_FRIEND_SEND_MESSAGE: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_GET_PORT value. If none,
   * will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_GET_PORT value
   * @return {Error} Error, if any
   */
  getPort: function(val) {
    if(val !== consts.TOX_ERR_GET_PORT_OK) {
      return (new Error('TOX_ERR_GET_PORT: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_SET_INFO value. If none,
   * will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_SET_INFO value
   * @return {Error} Error, if any
   */
  setInfo: function(val) {
    if(val !== consts.TOX_ERR_SET_INFO_OK) {
      return (new Error('TOX_ERR_SET_INFO: ' + val));
    }
  },

  /**
   * Get an Error from a TOX_ERR_SET_TYPING value. If none,
   * will return undefined.
   * @private
   * @param {Number} val - TOX_ERR_SET_TYPING value
   * @return {Error} Error, if any
   */
  setTyping: function(val) {
    if(val !== consts.TOX_ERR_SET_TYPING_OK) {
      return (new Error('TOX_ERR_SET_TYPING: ' + val));
    }
  },

  /**
   * Get an error for when a function returns unsuccessful, but
   * its error value indicates success.
   * @private
   * @return {Error} Error
   */
  unsuccessful: function() {
    return new Error('api function returned unsuccessful, but error value indicates success');
  }
};
