var path = require('path');
var tox = require(path.join(__dirname, 'tox'));
var toxdns = require(path.join(__dirname, 'toxdns'));
var toxencryptsave = require(path.join(__dirname, 'toxencryptsave'));

tox.ToxDns = toxdns;
tox.ToxEncryptSave = toxencryptsave;
module.exports = tox;
