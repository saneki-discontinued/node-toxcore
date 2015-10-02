node-toxcore [![Build Status](https://img.shields.io/travis/saneki/node-toxcore.svg?style=flat-square)](http://travis-ci.org/saneki/node-toxcore) [![NPM Version](https://img.shields.io/npm/v/toxcore.svg?style=flat-square)](https://www.npmjs.org/package/toxcore) [![Dependency Status](https://david-dm.org/saneki/node-toxcore.svg?style=flat-square)](https://david-dm.org/saneki/node-toxcore)
============

[![NPM](https://nodei.co/npm/toxcore.png?mini=true)](https://nodei.co/npm/toxcore/)

Node.js bindings for [libtoxcore], built off of [node-ffi].

Note: Installing this package does not install [libtoxcore]. It is expected
that [libtoxcore] is installed prior to using **node-toxcore**.

### New API

**node-toxcore** now uses the new toxcore api. If you want
to use the old api, specify version `0.0.18` in your package.json. Note
that support for the old api is discontinued, and version `0.0.18` may
have bugs or not support certain things.


### New API Progress

- [x] toxcore
- [ ] toxav
- [ ] toxdns
- [x] toxencryptsave
- [x] tox_old.h (old groupchats)
- [ ] Higher level API


### Synchronous Example

``` js
var toxcore = require('toxcore');

// Create a default Tox instance
var tox = new toxcore.Tox();

// ... or, create a Tox instance using specific paths for toxcore libraries
var toxAtPath = new toxcore.Tox({
  path: '/path/to/libtoxcore.so',
  crypto: '/path/to/libtoxencryptsave.so'
});

// ... or, give Tox some data to load
var toxWithData = new toxcore.Tox({
  data: '/path/to/toxfile'
});

// ... if that data is encrypted, include a passphrase
var toxWithEncData = new toxcore.Tox({
  data: '/path/to/encrypted/toxfile',
  pass: 'myPassphrase'
});

// Bootstrap from nodes (see a list at: https://wiki.tox.im/Nodes)
tox.bootstrapSync('23.226.230.47', 33445, 'A09162D68618E742FFBCA1C2C70385E6679604B2D80EA6E84AD0996A1AC8A074'); // stal
tox.bootstrapSync('104.219.184.206', 443, '8CD087E31C67568103E8C2A28653337E90E6B8EDA0D765D57C6B5172B4F1F04C'); // Jfreegman

// Set your name and status message
tox.setNameSync('My username');
tox.setStatusMessageSync('Hello world!');

// Listen for friend requests
tox.on('friendRequest', function(e) {
  console.log('Friend request from: ' + e.publicKeyHex());
});

// Print received friend messages to console
tox.on('friendMessage', function(e) {
  var friendName = tox.getFriendNameSync(e.friend());
  console.log(friendName + ': ' + e.message());
});

// Print out your tox address so others can add it
console.log('Address: ' + tox.getAddressHexSync());

// Start!
tox.start();
```

For more examples, see the `examples/` directory.


### Documentation

Generating the documentation should be as easy as `grunt jsdoc`.


[libtoxcore]:https://github.com/irungentoo/toxcore
[node-ffi]:https://github.com/node-ffi/node-ffi
