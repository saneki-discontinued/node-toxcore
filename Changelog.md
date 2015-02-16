Changelog
=========

v0.0.12
-------
- Added async/sync ToxAV#addGroupchat() functions.

v0.0.11
-------
- Added `type` field to events.
- Added more emitter methods: Tox#off(), Tox#getEmitter().
- Modified GroupInviteEvent: #type() -> #chatType(), added a few helper methods.
- Started on ToxAV, creating a Tox object will try to create an internal ToxAV
  object unless told not to, can be gotten by Tox#getAV().
- Tox#setName() fix.

v0.0.10
-------
- Tox#start(), Tox#stop(), Tox#isStarted() for internal interval.

v0.0.9
------
- Support for ToxEncryptSave functions.

v0.0.8
------
- Sync/async groupchat title functions.
- groupTitle event.

v0.0.7
------
- Several sync functions improved.
- Typescript declaration file updated.
- Fix for GroupNamelistChangeEvent#peer().

v0.0.6
------
- Fix for `joinGroupchat`.
- Added typescript declaration file.

v0.0.5
------
- Sync/async functions for bootstrapping, relays, checking if connected.

v0.0.4
------
- Sync/async functions for saving/loading (old save and load functions renamed to saveToFile, loadFromFile).
- Async hash function.

v0.0.3
------
- Sync/async functions for file transfer functions in `tox.h`.
- Support for file transfer events.

v0.0.2
------
- Event objects for events in `tox.h`.

v0.0.1
------
- Initial version, has sync/async functions for most functions in `tox.h`,
  although not all.
- Support for most events in `tox.h`.
- Some mostly-untested `toxdns.h` stuff.
