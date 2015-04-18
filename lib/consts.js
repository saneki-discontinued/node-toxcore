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

var _ = require('underscore');
var consts = {
  TOX_KEY_SIZE: 32,
  TOX_FRIEND_ADDRESS_SIZE: (32 + 6),
  TOX_MAX_NAME_LENGTH: 128,
  TOX_MAX_STATUS_MESSAGE_LENGTH: 1007,
  TOX_MAX_MESSAGE_LENGTH: 1368,
  TOX_HASH_LENGTH: 32,
  TOX_AVATAR_MAX_DATA_LENGTH: 16384,
  TOX_GROUPCHAT_TYPE_TEXT: 0,
  TOX_GROUPCHAT_TYPE_AV: 1,
  TOX_PROXY_NONE: 0,
  TOX_PROXY_SOCKS5: 1,
  TOX_PROXY_HTTP: 2,
  TOX_SALT_LENGTH: 32,
  TOXDNS_MAX_RECOMMENDED_NAME_LENGTH: 32
};

/**
 * Make TOX_* consts global.
 */
consts.globalify = function() {
  _.each(consts, function(value, key, list) {
    if(key.match(/^TOX/)) {
      global[key] = value;
    }
  });
};

module.exports = consts;
