Changelog
=========

v1.2.0
------
- Added ToxEncryptSave for libtoxencryptsave.

v1.1.4
------
- Added lossless/lossy packet functionality (credits: [OguzhanE]).
- Use ToxError for errors (credits: [OguzhanE]).

v1.1.3
------
- Fixed assert error that occurred when inspecting a Tox object.

v1.1.2
------
- Fixed Tox#sendFriendMessageSync() to return message Id (credits: [mensinda]).

v1.1.1
------
- Update for toxcore api change ([8e80ced](https://github.com/irungentoo/toxcore/commit/8e80ced)).
- Fixed Tox#getOptions() when proxy_address is NULL.

v1.1.0
------
- Added functions, events and consts related to transferring files.
- Added hashing functions Tox#hash(), Tox#hashSync().

v1.0.2
------
- Added Tox.load() for asynchronously creating a Tox object.
- Added 'data' option for Tox construction, which specifies the data to load
  as either a Buffer or a filepath (string). If given a filepath, this will
  read the file synchronously if (new Tox()) is used, and asynchronously if
  Tox.load() is used.
- Added Tox#saveToFile(), Tox#saveToFileSync() for saving state to a file.

v1.0.1
------
- Updated typescript definitions file.

v1.0.0
------
- Dropped support for old api in support of new api.
- toxcore and tox_old (old groupchats) implemented for the most part, except
  for file transfer functions (may have missed a few other functions).

[Arvius]:https://github.com/Arvius
[mensinda]:https://github.com/mensinda
[OguzhanE]:https://github.com/OguzhanE
