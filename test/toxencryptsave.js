var assert = require('assert');
var path = require('path');
var should = require('should');
var toxcore = require(path.join(__dirname, '..', 'lib', 'main'));
var ToxEncryptSave = toxcore.ToxEncryptSave;

describe('ToxEncryptSave', function() {
  var enc = new ToxEncryptSave();

  describe('#getEncryptionExtraLength()', function() {
    it('should return a positive number in callback', function(done) {
      enc.getEncryptionExtraLength(function(err, res) {
        res.should.be.type('number').and.be.greaterThan(0);
        done(err);
      });
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
  });

  describe('#getSaltLengthSync()', function() {
    it('should return a positive number', function() {
      enc.getSaltLengthSync().should.be.type('number').and.be.greaterThan(0);
    });
  });
});
