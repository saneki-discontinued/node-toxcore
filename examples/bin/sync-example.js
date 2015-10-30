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
 * A tiny tox bot example using node-toxcore's synchronous methods (new_api).
 */
var testingMode=false;

var path = require('path');
var toxcore = !testingMode ? require('toxcore') : require(path.join(__dirname, '..', '..', 'lib', 'main'));
var tox = new toxcore.Tox();

/**
 * Bootstrap tox via hardcoded nodes.
 * For more nodes, see: https://wiki.tox.chat/users/nodes
 */
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

// Bootstrap from nodes
nodes.forEach(function(node) {
  tox.bootstrapSync(node.address, node.port, node.key);
  console.log('Successfully bootstrapped from ' + node.maintainer + ' at ' + node.address + ':' + node.port);
  console.log('... with key ' + node.key);
});

tox.on('selfConnectionStatus', function(e) {
  console.log(e.isConnected() ? 'Connected' : 'Disconnected');
});

tox.on('friendName', function(e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + '[' + e.friend() + '] changed their name: ' + e.name());
});

tox.on('friendStatusMessage', function(e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + '[' + e.friend() + '] changed their status message: ' + e.statusMessage());
});

tox.on('friendStatus', function(e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + '[' + e.friend() + '] changed their status: ' + e.status());
});

tox.on('friendConnectionStatus', function(e) {
  var name = tox.getFriendNameSync(e.friend());
  var statusMessage = tox.getFriendStatusMessageSync(e.friend());
  console.log(name + '[' + e.friend() + '] is now ' + (e.isConnected() ? 'online' : 'offline') + ': ' + statusMessage);

});

tox.on('friendTyping', function(e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + '[' + e.friend() + '] is ' + (e.isTyping() ? 'typing' : 'not typing'));
});

tox.on('friendReadReceipt', function(e) {
  var name = tox.getFriendNameSync(e.friend());
  console.log(name + '[' + e.friend() + '] receipt: ' + e.receipt());
});

tox.on('friendRequest', function(e) {
  tox.addFriendNoRequestSync(e.publicKey());
  console.log('Received friend request: ' + e.message());
  console.log('Accepted friend request from ' + e.publicKeyHex());
});

tox.on('friendMessage', function(e) {
  var name = tox.getFriendNameSync(e.friend());
  if(e.isAction()) {
    console.log('** ' + name + '[' + e.friend() + '] ' + e.message() + ' **');
  } else {
    console.log(name + '[' + e.friend() + ']: ' + e.message());
  }
  // Echo the message back
  tox.sendFriendMessageSync(e.friend(), e.message(), e.messageType());

  if(e.message() === 'typing on') {
    tox.setTypingSync(e.friend(), true);
    console.log('Started typing to ' + name + '[' + e.friend() + ']');
  } else if(e.message() === 'typing off') {
    tox.setTypingSync(e.friend(), false);
    console.log('Stopped typing to ' + name + '[' + e.friend() + ']');
  }

  if(e.message() === 'profile') {
    var statusMessage = tox.getFriendStatusMessageSync(e.friend()),
        status = tox.getFriendStatusSync(e.friend()),
        connectionStatus = tox.getFriendConnectionStatusSync(e.friend());
    console.log('Friend ' + e.friend() + ' profile:');
    console.log('  Name: ' + name);
    console.log('  Status message: ' + statusMessage);
    console.log('  Status: ' + status);
    console.log('  Connection status: ' + connectionStatus);
  }

  if(e.message() === 'lastonline') {
    var lastOnline = tox.getFriendLastOnlineSync(e.friend());
    console.log(name + ' last online: ' + lastOnline.toString());
  }

  if(e.message() === 'namelen') {
    console.log('Name length: ' + tox.getFriendNameSizeSync(e.friend()));
    console.log('Status message length: ' + tox.getFriendStatusMessageSizeSync(e.friend()));
  }
});

tox.on('friendLosslessPacket', function(e){
  var name = tox.getFriendNameSync(e.friend());  
  console.log('**Received lossless packet from ' + '[' + e.friend() + ']');
  console.log(e.data().toString());
  tox.sendLosslessPacketSync(e.friend(), new Buffer('lossless-receipt-packet-content'));
});

tox.setNameSync('Sync Bot');
tox.setStatusMessageSync('node-toxcore sync bot example');

console.log('Address: ' + tox.getAddressHexSync());

// Start the tox_iterate loop
tox.start();
