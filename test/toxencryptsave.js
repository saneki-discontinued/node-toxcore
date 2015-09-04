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

var assert = require('assert');
var buffertools = require('buffertools');
var path = require('path');
var should = require('should');

var ToxEncryptSave = require(path.join(__dirname, '..', 'lib', 'toxencryptsave'));
var consts = require(path.join(__dirname, '..', 'lib', 'consts'));

buffertools.extend();

describe('ToxEncryptSave', function() {
  var crypto = new ToxEncryptSave();

  describe('encryption and decryption', function() {
    it('should detect encrypted data', function() {
      var data = new Buffer('hello world'),
          edata = crypto.encryptSync(data, 'somePassphrase');
      crypto.isDataEncryptedSync(edata).should.be.true;
    });

    it('should detect encrypted data (async)', function(done) {
      var data = new Buffer('hello async world');
      crypto.encrypt(data, 'someAsyncPassphrase', function(err, edata) {
        if(!err) {
          crypto.isDataEncrypted(edata, function(err, isEnc) {
            if(!err) {
              isEnc.should.be.true;
              done();
            } else done(err);
          });
        } else done(err);
      });
    });

    it('should be able to decrypt encrypted data', function() {
      var data = new Buffer('some encrypted data'),
          passphrase = 'somePassphrase',
          edata = crypto.encryptSync(data, passphrase);

      // Encrypted data should differ from original
      edata.should.be.a.Buffer;
      (edata.equals(data)).should.be.false;

      var ddata = crypto.decryptSync(edata, passphrase);

      (ddata.equals(data)).should.be.true;
    });

    it('should be able to decrypt encrypted data (async)', function(done) {
      var data = new Buffer('some encrypted data'),
          passphrase = 'somePassphrase';
      crypto.encrypt(data, passphrase, function(err, edata) {
        if(!err) {
          // Encrypted data should differ from original
          edata.should.be.a.Buffer;
          (edata.equals(data)).should.be.false;

          crypto.decrypt(edata, passphrase, function(err, ddata) {
            (ddata.equals(data)).should.be.true;
            done(err);
          });
        } else done(err);
      });
    });
  });
});
