var assert = require('assert');
var buffertools = require('buffertools');
var should = require('should');
var path = require('path');
var toxcore = require(path.join(__dirname, '..', 'lib', 'main'));

buffertools.extend(); // Extend Buffer.prototype

describe('Tox', function() {
  var tox = new toxcore.Tox();

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
  });

  describe('#hashSync()', function() {
    var abcHashed = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

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

});
