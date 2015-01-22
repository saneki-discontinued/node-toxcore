var path = require('path');
var tox = require(path.join(__dirname, 'tox'));
var toxdns = require(path.join(__dirname, 'toxdns'));
var toxencryptsave = require(path.join(__dirname, 'toxencryptsave'));
var consts = require(path.join(__dirname, 'consts'));

tox.ToxDns = toxdns;
tox.ToxEncryptSave = toxencryptsave;
tox.Consts = consts;
module.exports = tox;
