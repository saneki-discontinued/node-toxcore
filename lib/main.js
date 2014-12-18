var path = require('path');
var tox = require(path.join(__dirname, 'tox'));
var toxdns = require(path.join(__dirname, 'toxdns'));

tox.ToxDns = toxdns;
module.exports = tox;
