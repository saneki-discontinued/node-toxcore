var assert = require('assert');
var buffertools = require('buffertools');
var should = require('should');
var path = require('path');
var toxcore = require(path.join(__dirname, '..', 'lib', 'main'));

buffertools.extend(); // Extend Buffer.prototype

describe('Tox', function() {
  var tox = new toxcore.Tox();

  var toxWithoutHandle = new toxcore.Tox();
  toxWithoutHandle.handle = undefined;

  var addressHexStringRegex = /^[a-fA-F0-9]{76}$/;
  var keyHexStringRegex = /^[a-fA-F0-9]{64}$/;

  var abcHashed = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

  describe('#checkHandle()', function() {
    it('should return an error in callback when no handle', function(done) {
      toxWithoutHandle.checkHandle(function(err) {
        err.should.exist;
        done();
      });
    });
  });

  describe('#checkHandleSync()', function() {
    it('should throw an error when no handle', function() {
      try {
        toxWithoutHandle.checkHandleSync();
        should.fail('checkHandleSync should have thrown an error');
      } catch(e) {
        e.should.exist;
      }
    });

    it('shouldn\'t throw an error when handle', function() {
      try {
        tox.checkHandleSync();
      } catch(e) {
        should.fail('checkHandleSync shouldn\'t have thrown an error');
      }
    });
  });

  describe('#countFriendList()', function() {
    it('should return 0 in callback when no friend', function(done) {
      tox.countFriendList(function(err, res) {
        res.should.equal(0);
        done(err);
      });
    });
  });

  describe('#countFriendListSync()', function() {
    it('should return 0 when no friends', function() {
      tox.countFriendListSync().should.equal(0);
    });
  });

  describe('#getAddress()', function() {
    it('should return a Buffer of the expected size in callback', function(done) {
      tox.getAddress(function(err, address) {
        address.length.should.equal(38); // TOX_FRIEND_ADDRESS_SIZE
        done(err);
      });
    });
  });

  describe('#getAddressSync()', function() {
    it('should return a Buffer of the expected size', function() {
      tox.getAddressSync().length.should.equal(38);
    });
  });

  describe('#getAddressHex()', function() {
    it('should return a hex string of the expected size in callback', function(done) {
      tox.getAddressHex(function(err, address) {
        address.should.match(addressHexStringRegex);
        done(err);
      });
    });
  });

  describe('#getAddressHexSync()', function() {
    it('should return a hex string of the expected size', function() {
      tox.getAddressHexSync().should.match(addressHexStringRegex);
    });
  });

  describe('#getFriendList()', function() {
    it('should return an empty array in callback when no friends', function(done) {
      tox.getFriendList(function(err, friends) {
        friends.length.should.equal(0);
        done(err);
      });
    });
  });

  describe('#getFriendListSync()', function() {
    it('should return an empty array when no friends', function() {
      tox.getFriendListSync().length.should.equal(0);
    });
  });

  describe('#getKeys()', function() {
    it('should return keys with expected lengths in callback', function(done) {
      tox.getKeys(true, function(err, pubkey, privkey) {
        privkey.length.should.equal(32);
        pubkey.length.should.equal(32);
        done(err);
      });
    });

    it('should only return public key in callback if specified', function(done) {
      tox.getKeys(false, function(err, pubkey, privkey) {
        should.exist(pubkey);
        should.not.exist(privkey);
        done(err);
      });
    });
  });

  describe('#getKeysSync()', function() {
    it('should return keys with expected lengths', function() {
      var keys = tox.getKeysSync(true);
      keys.length.should.equal(2);
      keys.forEach(function(key) {
        key.length.should.equal(32);
      });
    });

    it('should only return public key if specified', function() {
      var keys = tox.getKeysSync(false);
      keys.length.should.equal(1);
      keys[0].length.should.equal(32);
    });
  });

  describe('#getPrivateKey()', function() {
    it('should return a Buffer of the expected size in callback', function(done) {
      tox.getPrivateKey(function(err, key) {
        key.length.should.equal(32); // TOX_CLIENT_ID_SIZE
        done(err);
      });
    });
  });

  describe('#getPrivateKeySync()', function() {
    it('should return a Buffer of the expected size', function() {
      tox.getPrivateKeySync().length.should.equal(32);
    });
  });

  describe('#getPrivateKeyHex()', function() {
    it('should return a hex string of the expected size in callback', function(done) {
      tox.getPrivateKeyHex(function(err, key) {
        key.should.match(keyHexStringRegex);
        done(err);
      });
    });
  });

  describe('#getPrivateKeyHexSync()', function() {
    it('should return a hex string of the expected size', function() {
      tox.getPrivateKeyHexSync().should.match(keyHexStringRegex);
    });
  });

  describe('#getPublicKey()', function() {
    it('should return a Buffer of the expected size in callback', function(done) {
      tox.getPublicKey(function(err, key) {
        key.length.should.equal(32); // TOX_CLIENT_ID_SIZE
        done(err);
      });
    });
  });

  describe('#getPublicKeySync()', function() {
    it('should return a Buffer of the expected size', function() {
      tox.getPublicKeySync().length.should.equal(32);
    });
  });

  describe('#getPublicKeyHex()', function() {
    it('should return a hex string of the expected size in callback', function(done) {
      tox.getPublicKeyHex(function(err, key) {
        key.should.match(keyHexStringRegex);
        done(err);
      });
    });
  });

  describe('#getPublicKeyHexSync()', function() {
    it('should return a hex string of the expected size', function() {
      tox.getPublicKeyHexSync().should.match(keyHexStringRegex);
    });
  });

  describe('#hasFriend()', function() {
    it('should return false in callback if not added', function(done) {
      tox.hasFriend(0, function(err, res) {
        res.should.be.false;
        done(err);
      });
    });
  });

  describe('#hasFriendSync()', function() {
    it('should return false if not added', function() {
      tox.hasFriendSync(0).should.be.false;
    });
  });

  describe('#hasHandle()', function() {
    it('should return true if a tox handle is present', function() {
      tox.hasHandle().should.be.true;
    });

    it('should return false if no tox handle is present', function() {
      toxWithoutHandle.hasHandle().should.be.false;
    });
  });

  describe('#hash()', function() {
    it('should correctly hash a Buffer', function(done) {
      tox.hash(new Buffer('abc'), function(err, hash) {
        hash.toHex().toLowerCase().should.equal(abcHashed);
        done(err);
      });
    });

    it('should correctly hash a String', function(done) {
      tox.hash('abc', function(err, hash) {
        hash.toHex().toLowerCase().should.equal(abcHashed);
        done(err);
      });
    });
  });

  describe('#hashSync()', function() {
    it('should correctly hash a Buffer', function() {
      tox.hashSync(new Buffer('abc')).toHex().toLowerCase().should.equal(abcHashed);
    });

    it('should correctly hash a String', function() {
      tox.hashSync('abc').toHex().toLowerCase().should.equal(abcHashed);
    });
  });

  describe('#kill()', function() {
    it('should clear handle after killing', function(done) {
      var temp = new toxcore.Tox();
      temp.kill(function(err) {
        temp.hasHandle().should.not.exist;
        done(err);
      });
    });
  });

  describe('#killSync()', function() {
    it('should clear handle after killing', function() {
      var temp = new toxcore.Tox();
      temp.killSync();
      temp.hasHandle().should.not.exist;
    });
  });

  describe('#size()', function() {
    it('should return a positive integer in callback', function(done) {
      tox.size(function(err, size) {
        size.should.be.above(0);
        done(err);
      });
    });
  });

  describe('#sizeSync()', function() {
    it('should return a positive integer', function() {
      tox.sizeSync().should.be.above(0);
    });
  });
});
