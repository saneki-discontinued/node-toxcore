Changelog
=========

v0.0.18
-------
- Added Tox#getFriendConnectionStatus(), Tox#getFriendConnectionStatusSync(),
  Tox#getGroupchatPeerPublicKey(), Tox#getGroupchatPeerPublicKeySync(),
  Tox#getGroupchatPeerPublicKeyHex(), Tox#getGroupchatPeerPublicKeyHexSync().
  (thanks [mensinda])
- Added Tox#loadFromFileSync(), Tox#saveToFileSync().
- Fixed Tox#setUserStatus(). (thanks [Arvius])
- Fixed GroupActionEvent#peer(), GroupMessageEvent#peer(). (thanks [mensinda])

v0.0.17
-------
- Added Tox#sendAction(), Tox#sendActionSync().

v0.0.16
-------
- Modified parameter ordering of Tox#sendMessage(), Tox#sendMessageSync(): friend number then
  message instead of the other way around.
- Fixed null-term issues with a few functions: Tox#bootstrapFromAddress(),
  Tox#bootstrapFromAddressSync(), Tox#addTCPRelay(), Tox#addTCPRelaySync().
- Fixed Tox#deleteGroupchatSync().
- No more TOX_* variables polluting the global scope.
- Changed some "private" methods/member variables in Tox to be prefixed with _.

v0.0.15
-------
- Changed a lot of Tox methods to throw errors (or return them in callbacks) if
  not successful, instead of returning a boolean value. Some methods, such as
  Tox#getFriendNameSync(), still have the same successful return value, but now
  throw an error if something unexpected happens. All affected methods:
  Tox#deleteFriend(), Tox#deleteFriendSync(), Tox#deleteGroupchat(), Tox#deleteGroupchatSync(),
  Tox#getFriendNameSync(), Tox#getFriendStatusMessageSync(), Tox#getNameSync(),
  Tox#getStatusMessageSync(), Tox#invite(), Tox#inviteSync(), Tox#requestAvatarData(),
  Tox#requestAvatarDataSync(), Tox#requestAvatarInfo(), Tox#requestAvatarInfoSync(),
  Tox#sendGroupchatActionSync(), Tox#sendGroupchatMessageSync(), Tox#setAvatar(),
  Tox#setAvatarSync(), Tox#setName(), Tox#setNameSync(), Tox#setStatusMessage(),
  Tox#setStatusMessageSync(), Tox#setUserStatus(), Tox#setUserStatusSync(), Tox#unsetAvatar(),
  Tox#unsetAvatarSync()
- Removed console.log call in Tox#getGroupchatPeerNames()

v0.0.14
-------
- Allow Tox 'av' option to take a boolean or an object to be passed as ToxAV's
  opts parameter.
- Removed 'Core' and 'createCoreLibrary' from main exports.

v0.0.13
-------
- GroupTitleEvent works and doesn't break everything.

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

[Arvius]:https://github.com/Arvius
[mensinda]:https://github.com/mensinda
