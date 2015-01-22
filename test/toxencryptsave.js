var assert = require('assert');
var path = require('path');
var should = require('should');
var toxcore = require(path.join(__dirname, '..', 'lib', 'main'));
var ToxEncryptSave = toxcore.ToxEncryptSave;

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
        err.should.exist;
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
        e.should.exist;
      }
    });

    it('should return a positive number', function() {
      encWithHandle.getEncryptedSizeSync().should.be.type('number').and.be.greaterThan(0);
    });
  });
});
