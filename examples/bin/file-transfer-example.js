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
 * A tiny tox file transfer example using node-toxcore's file transfer methods.
 */

var fs = require('fs-ext');
var path = require('path');
var mkdirp = require('mkdirp');
var toxcore = require('toxcore');
var tox = new toxcore.Tox();
var consts = toxcore.Consts;

// Map of files: file_number => file_descriptor
var files = {};

var uploadPath = path.normalize(path.join(__dirname, '..', 'tmp'));

var CANCEL = consts.TOX_FILE_CONTROL_CANCEL,
    PAUSE = consts.TOX_FILE_CONTROL_PAUSE,
    RESUME = consts.TOX_FILE_CONTROL_RESUME;

var SEEK_SET = 0,
    SEEK_CUR = 1,
    SEEK_END = 2;

/**
 * Fix a filename by replacing all path separators with _.
 * @param {String} filename - Filename to fix
 * @return {String} Fixed filename
 */
var fixRecvFilename = function(filename) {
  ['/', '\\'].forEach(function(r) {
    filename = filename.replace(r, '_');
  });
  return filename;
};

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

// Auto-accept friend requests
tox.on('friendRequest', function(e) {
  tox.addFriendNoRequestSync(e.publicKey());
});

tox.on('fileRecvControl', function(e) {
  console.log('Received file control from %d: %s',
    e.friend(),
    e.controlName());

  // If cancel, release resources (close file)
  if(e.isCancel()) {
    var fd = files[e.file()];
    if(descriptor !== undefined) {
      fs.closeSync(fd);
      files[e.file()] = undefined;
    }
  }
});

tox.on('fileChunkRequest', function(e) {
  // Todo
});

tox.on('fileRecv', function(e) {
  if(e.kind() === consts.TOX_FILE_KIND_DATA) {
    var filename = fixRecvFilename(e.filename());
    if(filename.length > 0) {
      // Resulting path should look like:
      // {uploadPath}/friend_0/{filename}
      var friendDirName = ('friend_' + e.friend()),
          filepath = path.join(uploadPath, friendDirName, filename);

      // Make the parent directory
      try {
        mkdirp.sync(path.dirname(filepath), { mode: 0775 });
      } catch(e) { }

      // Open and store in file map
      var fd = fs.openSync(filepath, 'w');
      files[e.file()] = fd;

      // Tell sender we're ready to start the transfer
      tox.controlFileSync(e.friend(), e.file(), 'resume');
    } else {
      console.log('Fixed filename is empty string (original: %s)', e.filename());
      tox.controlFileSync(e.friend(), e.file(), 'cancel');
    }
  } else {
    // If not a data file (avatar), cancel
    console.log('File is avatar, ignoring');
    tox.controlFileSync(e.friend(), e.file(), 'cancel');
  }
});

tox.on('fileRecvChunk', function(e) {
  var fd = files[e.file()];

  if(e.isNull()) {
    console.log('NULL pointer for e.data(), ignoring received chunk');
    return;
  }

  // If length is 0, transfer is finished, release resources
  if(e.isFinal()) {
    fs.closeSync(fd);
    files[e.file()] = undefined;
  } else {
    fs.seekSync(fd, e.position(), SEEK_SET);
    fs.writeSync(fd, e.data(), 0, e.length());
  }
});

tox.setNameSync('File Transfer Bot');
tox.setStatusMessageSync('node-toxcore file transfer bot example');

console.log('Address: ' + tox.getAddressHexSync());

// Start the tox_iterate loop
tox.start();
