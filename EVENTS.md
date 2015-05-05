Events
======

This file presents the events emitted by instances of Tox objects. They can be
listened for by using `on`, for example: `tox.on('eventName', function(e) { ... });`

For each event, one event object is passed to the callback function. These event
objects are specified in `lib/events.js`, and have accessor methods for retrieving
information, such as `var friendNumber = e.friend();`

Tox
---

Name                   | Event object name           | Description
---------------------- | :-------------------------: | ---------------------------------------------------------
fileRecvControl        | FileRecvControlEvent        | Emitted when a file control is received.
fileChunkRequest       | FileChunkRequestEvent       | Emitted when a chunk of a file has been requested.
fileRecv               | FileRecvEvent               | Emitted when someone requests to send a file.
fileRecvChunk          | FileRecvChunkEvent          | Emitted when a chunk is received during a file transfer.
friendConnectionStatus | FriendConnectionStatusEvent | Emitted when a friend's connection status has changed.
friendMessage          | FriendMessageEvent          | Emitted when a friend message is received.
friendName             | FriendNameEvent             | Emitted when a friend's name has changed.
friendReadReceipt      | FriendReadReceiptEvent      | Emitted when a friend receipt is received.
friendRequest          | FriendRequestEvent          | Emitted when a friend request is received.
friendStatus           | FriendStatusEvent           | Emitted when a friend's status has changed.
friendStatusMessage    | FriendStatusMessageEvent    | Emitted when a friend's status message has changed.
friendTyping           | FriendTypingEvent           | Emitted when a friend's typing status has changed.
selfConnectionStatus   | SelfConnectionStatusEvent   | Emitted when our connection status has changed.
