Changelog
=========

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
