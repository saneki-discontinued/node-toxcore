var assert = require('assert');
var should = require('should');
var path = require('path');
var Toxcore = require(path.join(__dirname, '..', 'lib', 'main'));

describe('Tox', function() {
  var tox = new Toxcore.Tox();

  describe('#hasHandle()', function() {
    it('should return true if a tox handle is present', function() {
      tox.hasHandle().should.be.true;
    });
  });

});
