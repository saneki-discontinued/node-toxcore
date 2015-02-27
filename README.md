node-toxcore [![Build Status](https://img.shields.io/travis/saneki/node-toxcore.svg?style=flat-square)](http://travis-ci.org/saneki/node-toxcore) [![NPM Version](https://img.shields.io/npm/v/toxcore.svg?style=flat-square)](https://www.npmjs.org/package/toxcore)
============

[![NPM](https://nodei.co/npm/toxcore.png)](https://nodei.co/npm/toxcore/)

Node.js bindings for [libtoxcore], built off of [node-ffi].


### Warning

**node-toxcore** is in its very early stages. Until it reaches `v0.1.0`,
things may unexpectedly change! Be wary.


### Simple Example

``` js
var toxcore = require('toxcore');

// Create a default Tox instance
var tox = new toxcore.Tox();

// ... or, create a Tox instance without an internal ToxAV instance
var toxWithoutAV = new toxcore.Tox({
  av: false
});

// ... or, create a Tox instance using specific paths for toxcore libraries
var toxAtPath = new toxcore.Tox({
  path: '/path/to/libtoxcore.so',
  av: {
    path: '/path/to/libtoxav.so'
  }
});

// Bootstrap from nodes (see a list at: https://wiki.tox.im/Nodes)
tox.bootstrapFromAddressSync('23.226.230.47', 33445, 'A09162D68618E742FFBCA1C2C70385E6679604B2D80EA6E84AD0996A1AC8A074'); // stal
tox.bootstrapFromAddressSync('104.219.184.206', 443, '8CD087E31C67568103E8C2A28653337E90E6B8EDA0D765D57C6B5172B4F1F04C'); // Jfreegman

// Set your name and status message
tox.setNameSync('My username');
tox.setStatusMessageSync('Hello world!');

// Listen for friend requests
tox.on('friendRequest', function(e) {
  console.log('Friend request from: ' + e.publicKeyHex());
});

// Start!
tox.start();
```


### Documentation

Generating the documentation should be as easy as `grunt jsdoc`.


[libtoxcore]:https://github.com/irungentoo/toxcore
[node-ffi]:https://github.com/node-ffi/node-ffi
