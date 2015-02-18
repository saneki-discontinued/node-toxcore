var assert = require('assert');
var buffertools = require('buffertools');
var path = require('path');
var should = require('should');
var toxcore = require(path.join(__dirname, '..', 'lib', 'main'));
var ToxEncryptSave = toxcore.ToxEncryptSave;

buffertools.extend(); // Extend Buffer.prototype

describe('ToxEncryptSave', function() {
  var enc = new ToxEncryptSave();
  var encWithHandle = new ToxEncryptSave(new toxcore.Tox());

  describe('#getEncryptionExtraLength()', function() {
    it('should return a positive number in callback', function(done) {
      enc.getEncryptionExtraLength(function(err, res) {
        res.should.be.type('number').and.be.greaterThan(0);
        done(err);
      });
    });

    it('should act synchronously when no callback passed (if sync option enabled)', function() {
      enc.getEncryptionExtraLength().should.be.type('number').and.be.greaterThan(0);
    });
  });

  describe('#getEncryptionExtraLengthSync()', function() {
    it('should return a positive number', function() {
      enc.getEncryptionExtraLengthSync().should.be.type('number').and.be.greaterThan(0);
    });
  });

  describe('#getKeyLength()', function() {
    it('should return a positive number in callback', function(done) {
      enc.getKeyLength(function(err, res) {
        res.should.be.type('number').and.be.greaterThan(0);
        done(err);
      });
    });

    it('should act synchronously when no callback passed (if sync option enabled)', function() {
      enc.getKeyLength().should.be.type('number').and.be.greaterThan(0);
    });
  });

  describe('#getKeyLengthSync()', function() {
    it('should return a positive number', function() {
      enc.getKeyLengthSync().should.be.type('number').and.be.greaterThan(0);
    });
  });

  describe('#getSaltLength()', function() {
    it('should return a positive number in callback', function(done) {
      enc.getSaltLength(function(err, res) {
        res.should.be.type('number').and.be.greaterThan(0);
        done(err);
      });
    });

    it('should act synchronously when no callback passed (if sync option enabled)', function() {
      enc.getSaltLength().should.be.type('number').and.be.greaterThan(0);
    });
  });

  describe('#getSaltLengthSync()', function() {
    it('should return a positive number', function() {
      enc.getSaltLengthSync().should.be.type('number').and.be.greaterThan(0);
    });
  });

  describe('#getEncryptedSize()', function() {
    it('should return an Error in callback if no handle', function(done) {
      enc.getEncryptedSize(function(err, res) {
        should.exist(err);
        done();
      });
    });

    it('should return a positive number in callback', function(done) {
      encWithHandle.getEncryptedSize(function(err, res) {
        res.should.be.type('number').and.be.greaterThan(0);
        done(err);
      });
    });

    it('should act synchronously when no callback passed (if sync option enabled)', function() {
      encWithHandle.getEncryptedSize().should.be.type('number').and.be.greaterThan(0);
    });
  });

  describe('#getEncryptedSizeSync()', function() {
    it('should throw an Error if no handle', function() {
      try {
        enc.getEncryptedSizeSync();
        should.fail('getEncryptedSizeSync should have thrown an error');
      } catch(e) {
        should.exist(e);
      }
    });

    it('should return a positive number', function() {
      encWithHandle.getEncryptedSizeSync().should.be.type('number').and.be.greaterThan(0);
    });
  });

  describe('#isDataEncrypted()', function() {
    it('should return false in callback if data magic number is 0', function(done) {
      enc.isDataEncrypted(new Buffer([0, 0]), function(err, res) {
        res.should.be.false;
        done(err);
      });
    });

    it('should act synchronously when no callback passed (if sync option enabled)', function() {
      enc.isDataEncrypted(new Buffer([0, 0])).should.be.false;
    });
  });

  describe('#isDataEncryptedSync()', function() {
    it('should return false if data magic number is 0', function() {
      enc.isDataEncryptedSync(new Buffer([0, 0])).should.be.false;
    });
  });

  describe('#deriveKeyFromPass()', function() {
    it('should return some data in callback', function(done) {
      enc.deriveKeyFromPass('somePassword', function(err, keyBuffer) {
        keyBuffer.length.should.be.greaterThan(0);
        done(err);
      });
    });

    it('should act synchronously when no callback passed (if sync option enabled)', function() {
      var keyBuffer = enc.deriveKeyFromPass('somePassword');
      keyBuffer.length.should.be.greaterThan(0);
    });
  });

  describe('#deriveKeyFromPassSync()', function() {
    it('should return some data', function() {
      var keyBuffer = enc.deriveKeyFromPassSync('somePassword');
      keyBuffer.length.should.be.greaterThan(0);
    });
  });

  describe('#deriveKeyWithSalt()', function() {
    var salt = new Buffer(32); // TOX_SALT_LENGTH

    it('should return some data in callback', function(done) {
      enc.deriveKeyWithSalt('somePassword', salt, function(err, keyBuffer) {
        keyBuffer.length.should.be.greaterThan(0);
        done(err);
      });
    });

    it('should act synchronously when no callback passed (if sync option enabled)', function() {
      var keyBuffer = enc.deriveKeyWithSalt('somePassword', salt);
      keyBuffer.length.should.be.greaterThan(0);
    });
  });

  describe('#deriveKeyWithSaltSync()', function() {
    var salt = new Buffer(32); // TOX_SALT_LENGTH

    it('should return some data', function() {
      var keyBuffer = enc.deriveKeyWithSaltSync('somePassword', salt);
      keyBuffer.length.should.be.greaterThan(0);
    });
  });

  describe('#passKeyEncrypt(), #passKeyDecrypt()', function() {
    it('should encrypt and decrypt some data', function(done) {
      var key = enc.deriveKeyFromPassSync('somePassword'),
          data = new Buffer(16);

      // Encrypt data
      enc.passKeyEncrypt(data, key, function(err, encData) {
        if(err) {
          done(err);
          return;
        }

        encData.length.should.be.greaterThan(0);

        // Decrypt encrypted data
        enc.passKeyDecrypt(encData, key, function(err, decData) {
          should(decData.equals(data)).be.ok;
          done(err);
        });
      });
    });

    it('should act synchronously when no callback passed (if sync option enabled)', function() {
      var key = enc.deriveKeyFromPassSync('somePassword'),
          data = new Buffer(16),
          encData = enc.passKeyEncrypt(data, key);

      encData.length.should.be.greaterThan(0);

      var decData = enc.passKeyDecrypt(encData, key);

      should(decData.equals(data)).be.ok;
    });
  });

  describe('#passKeyEncryptSync(), #passKeyDecryptSync()', function() {
    it('should encrypt and decrypt some data', function() {
      var key = enc.deriveKeyFromPassSync('somePassword'),
          data = new Buffer(16),
          encData = enc.passKeyEncryptSync(data, key);

      encData.length.should.be.greaterThan(0);

      var decData = enc.passKeyDecryptSync(encData, key);

      should(decData.equals(data)).be.ok;
    });
  });

  describe('#encryptedKeySave(), #decryptedKeySave()', function() {
    it('should save and load', function(done) {
      var key = enc.deriveKeyFromPassSync('somePassword');

      encWithHandle.encryptedKeySave(key, function(err, data) {
        if(err) {
          done(err);
          return;
        }

        should.exist(data);

        encWithHandle.encryptedKeyLoad(data, key, function(err) {
          done(err);
        });
      });
    });

    it('should save and load synchronously when no callbacks passed (if sync option enabled)', function() {
      var key = enc.deriveKeyFromPassSync('somePassword'),
          data = encWithHandle.encryptedKeySave(key);
      encWithHandle.encryptedKeyLoad(data, key);
    });
  });

  describe('#encryptedKeySaveSync(), #decryptedKeySaveSync()', function() {
    it('should save and load', function() {
      var key = enc.deriveKeyFromPassSync('somePassword'),
          data = encWithHandle.encryptedKeySaveSync(key);
      encWithHandle.encryptedKeyLoadSync(data, key);
    });
  });

  describe('#passEncrypt(), #passDecrypt()', function() {
    it('should encrypt and decrypt', function(done) {
      var passphrase = 'somePassword',
          data = new Buffer(100);
      enc.passEncrypt(data, passphrase, function(err, encData) {
        if(err) {
          done(err);
          return;
        }

        enc.passDecrypt(encData, passphrase, function(err, decData) {
          should(decData.equals(data)).be.ok;
          done(err);
        });
      });
    });

    it('should encrypt and decrypt synchronously when no callbacks passed (if sync option enabled)', function() {
      var passphrase = 'somePassword',
          data = new Buffer(100);
      var encData = enc.passEncrypt(data, passphrase);
      should.exist(encData);
      var decData = enc.passDecrypt(encData, passphrase);
      should(decData.equals(data)).be.ok;
    });
  });

  describe('#passEncryptSync(), #passDecryptSync()', function() {
    it('should encrypt and decrypt', function() {
      var passphrase = 'somePassword',
          data = new Buffer(100);
      var encData = enc.passEncryptSync(data, passphrase);
      should.exist(encData);
      var decData = enc.passDecryptSync(encData, passphrase);
      should(decData.equals(data)).be.ok;
    });
  });

  describe('#encryptedSave(), #encryptedLoad()', function() {
    it('should encrypt and decrypt a Tox instance asynchronously', function(done) {
      var passphrase = 'somePasswordYo';
      encWithHandle.encryptedSave(passphrase, function(err, encData) {
        if(err) {
          done(err);
          return;
        }

        encWithHandle.encryptedLoad(encData, passphrase, function(err) {
          done(err);
        });
      });
    });

    it('should encrypt and decrypt a Tox instance synchronously when no callbacks passed (if sync option enabled)',
      function() {
      var passphrase = 'somePasswordYo',
          encData = encWithHandle.encryptedSave(passphrase);
      encWithHandle.encryptedLoad(encData, passphrase);
    });

    it('should fail decrypting when given a different passphrase', function(done) {
      encWithHandle.encryptedSave('neverUseMeAgain', function(err, encData) {
        if(err) {
          done(err);
          return;
        }

        encWithHandle.encryptedLoad(encData, 'wrongPassword', function(err) {
          should.exist(err);
          done();
        });
      });
    });
  });

  describe('#encryptedSaveSync(), #encryptedLoadSync()', function() {
    it('should encrypt and decrypt a Tox instance', function() {
      var passphrase = 'somePasswordYo',
          encData = encWithHandle.encryptedSaveSync(passphrase);
      encWithHandle.encryptedLoadSync(encData, passphrase);
    });

    it('should fail decrypting when given a different passphrase', function() {
      var encData = encWithHandle.encryptedSaveSync('neverUseMeAgain');
      try {
        encData.encryptedLoadSync(encData, 'wrongPassword');
        should.fail('encryptedLoadSync should have thrown an error');
      } catch(err) {
        should.exist(err);
      }
    });
  });
});
