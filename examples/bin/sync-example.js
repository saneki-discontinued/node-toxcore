/**
 * A tiny tox echo-bot example using node-toxcore's synchronous methods.
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
  tox.sendMessageSync(evt.message(), evt.friend());
  console.log('Echoed message from friend ' + evt.friend() + ': ' + evt.message());
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

// Print our tox address
console.log('Address: ' + tox.getAddressHexSync());

// Start the tox_do loop
tox.start();
