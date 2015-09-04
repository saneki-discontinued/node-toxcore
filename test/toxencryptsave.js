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

    it('should get the salt from encrypted data', function() {
      var pass = 'somePassword',
          data = new Buffer('some data'),
          edata = crypto.encryptSync(data, pass),
          salt = crypto.getSaltSync(edata);
      salt.should.be.a.Buffer;
      salt.length.should.equal(consts.TOX_PASS_SALT_LENGTH);
    });

    it('should get the salt from encrypted data (async)', function(done) {
      var pass = 'somePassphrase',
          data = new Buffer('encrypt me');
      crypto.encrypt(data, pass, function(err, edata) {
        if(!err) {
          crypto.getSalt(edata, function(err, salt) {
            if(!err) {
              salt.should.be.a.Buffer;
              salt.length.should.equal(consts.TOX_PASS_SALT_LENGTH);
              done();
            } else done(err);
          });
        } else done(err);
      });
    });
  });

  describe('key derivation', function() {
    it('should derive a key with a random salt', function() {
      var obj = crypto.deriveKeyFromPassSync('somePassword');
      obj.key.should.be.a.Buffer;
      obj.key.length.should.equal(consts.TOX_PASS_KEY_LENGTH);
      obj.salt.should.be.a.Buffer;
      obj.salt.length.should.equal(consts.TOX_PASS_SALT_LENGTH);
    });

    it('should derive a key with a random salt (async)', function(done) {
      crypto.deriveKeyFromPass('somePassphrase', function(err, obj) {
        if(!err) {
          obj.key.should.be.a.Buffer;
          obj.key.length.should.equal(consts.TOX_PASS_KEY_LENGTH);
          obj.salt.should.be.a.Buffer;
          obj.salt.length.should.equal(consts.TOX_PASS_SALT_LENGTH);
          done();
        } else done(err);
      });
    });

    it('should derive a key with a given salt', function() {
      var pass = 'somePassphrase',
          obj = crypto.deriveKeyFromPassSync(pass),
          otherObj = crypto.deriveKeyWithSaltSync(pass, obj.salt);
      (obj.salt.equals(otherObj.salt)).should.be.true;
      (obj.key.equals(otherObj.key)).should.be.true;
    });

    it('should derive a key with a given salt (async)', function(done) {
      var pass = 'asyncPassword';
      crypto.deriveKeyFromPass(pass, function(err, obj) {
        if(!err) {
          crypto.deriveKeyWithSalt(pass, obj.salt, function(err, otherObj) {
            if(!err) {
              (obj.salt.equals(otherObj.salt)).should.be.true;
              (obj.key.equals(otherObj.key)).should.be.true;
              done();
            } else done(err);
          });
        } else done(err);
      });
    });
  });
});
