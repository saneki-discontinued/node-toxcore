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
 * Tox bot displaying node-toxcore usage of old groupchats.
 */

var toxcore = require('toxcore');
var tox = new toxcore.Tox({ old: true });
var groupnum = -1;

// These should be in consts?
var TOX_CHAT_CHANGE_PEER_ADD = 0;
var TOX_CHAT_CHANGE_PEER_DEL = 1;
var TOX_CHAT_CHANGE_PEER_NAME = 2;

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

// Bootstrap from nodes
nodes.forEach(function(node) {
  tox.bootstrapSync(node.address, node.port, node.key);
  console.log('Successfully bootstrapped from ' + node.maintainer + ' at ' + node.address + ':' + node.port);
  console.log('... with key ' + node.key);
});

// Init group
groupnum = tox.old().addGroupchatSync();

tox.on('selfConnectionStatus', function(e) {
  console.log(e.isConnected() ? 'Connected' : 'Disconnected');
});

// Accept all friend requests
tox.on('friendRequest', function(e) {
  tox.addFriendNoRequestSync(e.publicKey());
  console.log('Received friend request: ' + e.message());
  console.log('Accepted friend request from ' + e.publicKeyHex());
});

tox.on('friendMessage', function(e) {
  var name = tox.getFriendNameSync(e.friend());
  if(e.message() === 'invite') {
    tox.old().inviteSync(e.friend(), groupnum);
    console.log('Invited ' + name + ' to group');
  }
});

tox.old().on('groupMessage', function(e) {
  var name = tox.old().getGroupchatPeernameSync(e.group(), e.peer());
  console.log(name + ': ' + e.message());
});

tox.old().on('groupAction', function(e) {
  var name = tox.old().getGroupchatPeernameSync(e.group(), e.peer());
  console.log('** ' + name + ' ' + e.message() + ' **');
});

tox.old().on('groupNamelistChange', function(e) {
  if(e.change() === TOX_CHAT_CHANGE_PEER_ADD) {
    // Peername here will always be 'Tox User'
    console.log('Peer ' + e.peer() + ' has joined the chat');
  } else if(e.change() === TOX_CHAT_CHANGE_PEER_DEL) {
    // Trying to get peername here will throw an error
    console.log('Peer ' + e.peer() + ' has left the chat');
  } else if(e.change() === TOX_CHAT_CHANGE_PEER_NAME) {
    var name = tox.old().getGroupchatPeernameSync(e.group(), e.peer());
    console.log('Peer ' + e.peer() + ' is now known as ' + name);
  } else {
    console.log('Unknown change: ' + e.change());
  }
});

tox.old().on('groupTitle', function(e) {
  var name = tox.old().getGroupchatPeernameSync(e.group(), e.peer());
  console.log(name + ' changed the group title: ' + e.title());
});

tox.setNameSync('Sync Bot (Old Groupchats)');
tox.setStatusMessageSync('node-toxcore old groupchats sync bot example');

console.log('Address: ' + tox.getAddressHexSync());

// Start the tox_iterate loop
tox.start();
