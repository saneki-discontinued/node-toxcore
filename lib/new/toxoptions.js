var ref = require('ref');
var RefStruct = require('ref-struct');

var ToxEnum = 'int32';

var ToxOptions = RefStruct({
  'ipv6_enabled': 'uint8',
  'udp_enabled': 'uint8',
  '_padding1': 'uint16',
  'proxy_type': ToxEnum,
  'proxy_address': ref.refType('uint8'),
  'proxy_port': 'uint16',
  'start_port': 'uint16',
  'end_port': 'uint16'
});

module.exports = ToxOptions;
