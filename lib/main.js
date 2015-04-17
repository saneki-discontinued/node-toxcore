var path = require('path');
var tox = require(path.join(__dirname, 'tox'));
var toxav = require(path.join(__dirname, 'toxav'));
var toxdns = require(path.join(__dirname, 'toxdns'));
var toxencryptsave = require(path.join(__dirname, 'toxencryptsave'));
var consts = require(path.join(__dirname, 'consts'));

var newApi = {
  Tox: require(path.join(__dirname, 'new', 'tox')),
  Consts: require(path.join(__dirname, 'new', 'consts'))
};

module.exports = {
  Tox: tox,
  ToxAV: toxav,
  ToxDns: toxdns,
  ToxEncryptSave: toxencryptsave,
  Consts: consts,
  new: newApi,
  NewApiConsts: newApi.Consts,
  NewApiTox: newApi.Tox
};
