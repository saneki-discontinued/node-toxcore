Events
======

This file presents the events emitted by instances of Tox objects. They can be
listened for by using `on`, for example: `tox.on('eventName', function(e) { ... });`

For each event, one event object is passed to the callback function. These event
objects are specified in `lib/events.js`, and have accessor methods for retrieving
information, such as `var friendNumber = e.friend();`

Tox
---

Name                | Event object name        | Description
------------------- | :----------------------: | ------------------------------------------------------
avatarData          | AvatarDataEvent          | Emitted when avatar data is received.
avatarInfo          | AvatarInfoEvent          | Emitted when avatar info is received.
connectionStatus    | ConnectionStatusEvent    | Emitted when a friend's connection status changes.
friendAction        | FriendActionEvent        | Emitted when a friend action (/me message).
friendMessage       | FriendMessageEvent       | Emitted when a friend message is received.
friendRequest       | FriendRequestEvent       | Emitted when a friend request is received.
groupAction         | GroupActionEvent         | Emitted when a group action is received (/me message).
groupInvite         | GroupInviteEvent         | Emitted when invited to a group.
groupMessage        | GroupMessageEvent        | Emitted when a group message is received.
groupNamelistChange | GroupNamelistChangeEvent | Emitted when a group's namelist changes.
nameChange          | NameChangeEvent          | Emitted when a friend's name changes.
readReceipt         | ReadReceiptEvent         | Emitted when a receipt is received.
statusMessage       | StatusMessageEvent       | Emitted when a friend's status message changes.
typingChange        | TypingChangeEvent        | Emitted when a friend's typing status changes.
userStatus          | UserStatusEvent          | Emitted when a friend's user status changes.

