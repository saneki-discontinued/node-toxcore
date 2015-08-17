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
var toxcore = require('toxcore');
var tx = new toxcore.Tox(), rx = new toxcore.Tox();

var LOSSLESS_CHANNEL = 160;
var LOSSY_CHANNEL = 200;

// Specify nodes to bootstrap from
var nodes = [
  { maintainer: 'saneki',
    address: '96.31.85.154',
    port: 33445,
    key: '674153CF49616CD1C4ADF44B004686FC1F6C9DCDD048EF89B117B3F02AA0B778' },
  { maintainer: 'Impyy',
    address: '178.62.250.138',
    port: 33445,
    key: '788236D34978D1D5BD822F0A5BEBD2C53C64CC31CD3149350EE27D4D9A2F9B6B' },
  { maintainer: 'sonOfRa',
    address: '144.76.60.215',
    port: 33445,
    key: '04119E835DF3E78BACF0F84235B300546AF8B936F035185E2A8E9E0A67C8924F' }
];


//
// Setup rx
//

rx.setNameSync('Packet Bot (recv)');
rx.setStatusMessageSync('Bot for testing lossless/lossy packet tx/rx');

rx.on('friendRequest', function(e) {
  console.log('[rx] Accepting friend request from: %s', e.publicKeyHex().toUpperCase());
  rx.addFriendNoRequestSync(e.publicKey());
});

rx.on('friendConnectionStatus', function(e) {
  console.log('[rx] Friend connection status: %s', e.isConnected() ? 'online' : 'offline');
});

var packetCallback = function(e) {
  var packetType = e.isLossless() ? 'lossless' : 'lossy';
  console.log('** Received %s packet from [%d] **', packetType, e.friend());
  console.log('Id: 0x%s', e.id().toString(16));
  console.log('Data: %s', e.data().toString());

  // Respond using the same id
  if(e.isLossless()) {
    rx.sendLosslessPacketSync(e.friend(), e.id(), new Buffer('lossless-receipt-packet-content'));
  } else {
    rx.sendLossyPacketSync(e.friend(), e.id(), new Buffer('lossy-receipt-packet-content'));
  }
};

// Event 'friendLosslessPacket': Listen for lossless packets
// e -> FriendPacketEvent
//   e.data()       -> {Buffer} Data buffer without leading id byte
//   e.friend()     -> {Number} Friend number
//   e.fullData()   -> {Buffer} Data buffer including the leading id byte
//   e.id()         -> {Number} Leading Id byte
//   e.isLossless() -> {Boolean} Whether or not the packet was lossless
//   e.isLossy()    -> {Boolean} Whether or not the packet was lossy
rx.on('friendLosslessPacket', packetCallback);

// Event: 'friendLossyPacket': Listen for lossy packets
// e -> FriendPacketEvent (same event as used in 'friendLosslessPacket' event)
rx.on('friendLossyPacket', packetCallback);


//
// Setup tx
//

tx.setNameSync('Packet Bot (send)');
tx.setStatusMessageSync('Bot for testing lossless/lossy packet tx/rx');

tx.on('selfConnectionStatus', function(e) {
  if(e.isConnected()) {
    console.log('[tx] Adding friend: %s', rx.getAddressHexSync().toUpperCase());
    tx.addFriendSync(rx.getAddressSync(), 'Hello');
  }
});

tx.on('friendConnectionStatus', function(e) {
  console.log('[tx] Friend connection status: %s', e.isConnected() ? 'online' : 'offline');
  if(e.isConnected()) {
    console.log('[tx] Sending lossless + lossy packets');
    tx.sendLosslessPacketSync(e.friend(), LOSSLESS_CHANNEL, new Buffer('hello-world-lossless'));
    tx.sendLossyPacketSync(e.friend(), LOSSY_CHANNEL, new Buffer('hello-world-lossy'));

    var losslessMessage2 = buffertools.concat(
      new Buffer([LOSSLESS_CHANNEL + 1]),
      new Buffer('lossless-2-param')
    );
    tx.sendLosslessPacketSync(e.friend(), losslessMessage2);

    var lossyMessage2 = buffertools.concat(
      new Buffer([LOSSY_CHANNEL + 1]),
      new Buffer('lossy-2-param')
    );
    tx.sendLossyPacketSync(e.friend(), lossyMessage2);
  }
});

tx.on('friendLosslessPacket', function(e) {
  console.log('[tx] Received lossless response: %s', e.data().toString());
});

tx.on('friendLossyPacket', function(e) {
  console.log('[tx] Received lossy response: %s', e.data().toString());
});


// Bootstrap and start each
[{ tox: tx, name: 'tx' }, { tox: rx, name: 'rx' }].forEach(function(obj) {
  var tox = obj.tox, toxName = obj.name;

  // Bootstrap from nodes
  nodes.forEach(function(node) {
    tox.bootstrapSync(node.address, node.port, node.key);
    console.log('[%s] Successfully bootstrapped from %s at %s:%d', toxName, node.maintainer, node.address, node.port);
    console.log('... with key %s', node.key);
  });

  tox.on('selfConnectionStatus', function(e) {
    console.log('[%s] %s', toxName, e.isConnected() ? 'Connected' : 'Disconnected');
  });

  console.log('[%s] Address: %s', toxName, tox.getAddressHexSync().toUpperCase());

  tox.start();
});
