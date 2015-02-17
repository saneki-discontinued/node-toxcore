var path = require('path');
var tox = require(path.join(__dirname, 'tox'));
var toxav = require(path.join(__dirname, 'toxav'));
var toxdns = require(path.join(__dirname, 'toxdns'));
var toxencryptsave = require(path.join(__dirname, 'toxencryptsave'));
var consts = require(path.join(__dirname, 'consts'));

module.exports = {
  Tox: tox,
  ToxAV: toxav,
  ToxDns: toxdns,
  ToxEncryptSave: toxencryptsave,
  Consts: consts
};
