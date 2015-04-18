/**
 * @file sync-example.js - A tiny tox echo-bot example using node-toxcore's
 * synchronous methods.
 *
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

var toxcore = require('toxcore');
var tox = new toxcore.Tox();

// Specify nodes to bootstrap from
var nodes = [
  { maintainer: 'Impyy',
    address: '178.62.250.138',
    port: 33445,
    key: '788236D34978D1D5BD822F0A5BEBD2C53C64CC31CD3149350EE27D4D9A2F9B6B' },
  { maintainer: 'sonOfRa',
    address: '144.76.60.215',
    port: 33445,
    key: '04119E835DF3E78BACF0F84235B300546AF8B936F035185E2A8E9E0A67C8924F' }
];

// Groupchat ids, will be updated later
var groupchats = {
  'text': -1,
  'av': -1
};

// Set our name, status message, user status
tox.setNameSync('Tox Sync Example');
tox.setStatusMessageSync('Whee!');
tox.setUserStatusSync(1); // 1 = away

// Setup friendRequest callback to auto-accept friend requests
tox.on('friendRequest', function(evt) {
  tox.addFriendNoRequestSync(evt.publicKey());
  console.log('Accepted friend request from ' + evt.publicKeyHex());
});

// Setup friendMessage callback to echo messages
tox.on('friendMessage', function(evt) {
  tox.sendMessageSync(evt.friend(), evt.message());
  console.log('Echoed message from friend ' + evt.friend() + ': ' + evt.message());
});

// Setup another friendMessage callback to handle groupchat invite requests
tox.on('friendMessage', function(evt) {
  if(evt.message() === 'invite text') {
    // Invite to text groupchat
    tox.inviteSync(evt.friend(), groupchats['text']);
  } else if(evt.message() === 'invite av') {
    // Invite to a/v groupchat
    tox.inviteSync(evt.friend(), groupchats['av']);
  }
});

// Setup groupInvite callback to auto-accept group invites
tox.on('groupInvite', function(evt) {
  var groupnum;
  if(evt.isChatText()) {
    groupnum = tox.joinGroupchatSync(evt.friend(), evt.data());
    console.log('Joined text groupchat ' + groupnum);
  } else if(evt.isChatAV()) {
    groupnum = tox.getAV().joinGroupchatSync(evt.friend(), evt.data());
    console.log('Joined audio/video groupchat ' + groupnum);
  };
});

// Bootstrap from nodes
nodes.forEach(function(node) {
  tox.bootstrapFromAddressSync(node.address, node.port, node.key);
});

// Create a new text groupchat and a new AV groupchat
groupchats['text'] = tox.addGroupchatSync();
groupchats['av'] = tox.getAV().addGroupchatSync();

// Print our tox address
console.log('Address: ' + tox.getAddressHexSync());

// Start the tox_do loop
tox.start();
