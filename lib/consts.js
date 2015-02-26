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
