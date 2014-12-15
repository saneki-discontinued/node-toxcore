var assert = require('assert');
var buffertools = require('buffertools');
var should = require('should');
var path = require('path');
var toxcore = require(path.join(__dirname, '..', 'lib', 'main'));

buffertools.extend(); // Extend Buffer.prototype

describe('Tox', function() {
  var tox = new toxcore.Tox();

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

});
