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

var fs = require('fs');
var toxcore = require('toxcore');

var crypto = new toxcore.ToxEncryptSave();
var passphrase = 'helloWorld';

/**
 * Encrypt some data at write it to a file.
 * @param {String} filepath - Path of file to write to
 * @param {Buffer} data - Data to encrypt and write
 */
var encrypt = function(filepath, data) {
  crypto.encryptFile(filepath, data, passphrase, function(err) {
    if (!err) {
      console.log('Successfully encrypted file!');
    } else {
      console.error('Unable to encrypt file', err);
    }
  });
};

/**
 * Decrypt some data and write it to a file.
 * @param {String} filepath - Path of file to write to
 * @param {Buffer} data - Data to decrypt and write
 */
var decrypt = function(filepath, data) {
  crypto.decrypt(data, passphrase, function(err, ddata) {
    if (!err) {
      fs.writeFile(filepath, ddata, function(err) {
        if (!err) {
          console.log('Successfully decrypted file!');
        } else {
          console.error('Unable to write decrypted data to the file', err);
        }
      });
    } else {
      console.error('Unable to decrypt data with passphrase', err);
    }
  });
};

/**
 * Given a file, encrypt it (if not yet encrypted) or decrypt it
 * (if already encrypted).
 * @param {String} filepath - Path of file
 */
var performCrypto = function(filepath) {
  fs.readFile(filepath, function(err, data) {
    if (!err) {
      crypto.isDataEncrypted(data, function(err, isEncrypted) {
        if (!err) {
          if (isEncrypted) {
            decrypt(filepath, data);
          } else {
            encrypt(filepath, data);
          }
        } else {
          console.error('Unable to determine if data is encrypted', err);
        }
      });
    } else {
      console.error('Unable to read input file', err);
    }
  });
};

var args = process.argv.slice(2);
if (args.length > 0) {
  var filepath = args[0];
  performCrypto(filepath);
} else {
  console.error('usage: node crypto-example.js <filepath>');
}
