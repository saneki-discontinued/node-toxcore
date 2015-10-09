// Type definitions for toxcore 1.3.0
// Project: https://github.com/saneki/node-toxcore
// Definitions by: saneki <https://github.com/saneki>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module 'toxcore' {
  import events = require('events');
  import EventEmitter = events.EventEmitter;

  interface ErrorCallback {
    (err: Error): void;
  }

  interface BooleanCallback {
    (err: Error, val: boolean): void;
  }

  interface BufferCallback {
    (err: Error, val: Buffer): void;
  }

  interface DateCallback {
    (err: Error, val: Date): void;
  }

  interface NumberCallback {
    (err: Error, val: number): void;
  }

  interface StringCallback {
    (err: Error, val: string): void;
  }

  interface NumberArrayCallback {
    (err: Error, list: number[]): void;
  }

  interface StringArrayCallback {
    (err: Error, list: string[]): void;
  }

  interface ToxCallback {
    (err: Error, tox: Tox): void;
  }

  interface GenerateObject {
    record: string;
    id: number;
  }

  interface GenerateCallback {
    (err: Error, generate: GenerateObject): void;
  }

  interface ToxDnsConstructorOptions {
    path?: string;
    key?: Buffer|string;
  }

  interface ToxDns {
    constructor(opts?: ToxDnsConstructorOptions);
    hasHandle(): boolean;
    getHandle(): any;
    getKey(): Buffer;
    getKeyHex(): string;
    getLibrary(): any;
    resolve(address: string, callback?: BufferCallback): void;
    resolveHex(address: string, callback?: StringCallback): void;

    decrypt(record: string, requestId: number, callback?: BufferCallback): void;
    decryptSync(record: string, requestId: number): Buffer;
    generate(name: string, callback?: GenerateCallback): void;
    generateSync(name: string): GenerateObject;
    kill(callback?: ErrorCallback): void;
    killSync(): void;
  }

  interface ToxPassKey {
  }

  interface ToxPassKeyCallback {
    (err: Error, passKey: ToxPassKey): void;
  }

  interface ToxEncryptSaveConstructorOptions {
    path?: string;
  }

  export class ToxEncryptSave {
    constructor(opts?: ToxEncryptSaveConstructorOptions);
    getLibrary(): any; // ffi.Library

    decrypt(data: Buffer, pass: Buffer|string, callback?: BufferCallback): void;
    decryptSync(data: Buffer, pass: Buffer|string): Buffer;
    encrypt(data: Buffer, pass: Buffer|string, callback?: BufferCallback): void;
    encryptSync(data: Buffer, pass: Buffer|string): Buffer;
    getSalt(data: Buffer, callback?: BufferCallback): void;
    getSaltSync(data: Buffer): Buffer;
    isDataEncrypted(data: Buffer, callback?: BooleanCallback): void;
    isDataEncryptedSync(data: Buffer): boolean;
    deriveKeyFromPass(pass: Buffer|string, callback?: ToxPassKeyCallback): void;
    deriveKeyFromPassSync(pass: Buffer|string): ToxPassKey;
    deriveKeyWithSalt(pass: Buffer|string, salt: Buffer, callback?: ToxPassKeyCallback): void;
    deriveKeyWithSaltSync(pass: Buffer|string, salt: Buffer): ToxPassKey;
    encryptFile(filepath: string, data: Buffer, pass: Buffer|string, callback?: ErrorCallback): void;
    encryptFileSync(filepath: string, data: Buffer, pass: Buffer|string): void;
    encryptPassKey(data: Buffer, passKey: ToxPassKey, callback?: BufferCallback): void;
    encryptPassKeySync(data: Buffer, passKey: ToxPassKey): Buffer;
    decryptFile(filepath: string, pass: Buffer|string, callback?: BufferCallback): void;
    decryptFileSync(filepath: string, pass: Buffer|string): Buffer;
    decryptPassKey(data: Buffer, passKey: ToxPassKey, callback?: BufferCallback): void;
    decryptPassKeySync(data: Buffer, passKey: ToxPassKey): Buffer;
  }

  interface ToxConstructorOptions {
    path?: string;
    data?: Buffer|string;
    crypto?: ToxEncryptSave|boolean|Object|string;
  }

  // Leaving out freeOptions/newOptions functions
  export class Tox {
    constructor(opts?: ToxConstructorOptions);
    static load(opts: ToxConstructorOptions, callback: ToxCallback): void;
    static load(callback: ToxCallback): void;

    createLibrary(libpath?: string): any; // ffi.Library
    crypto(): ToxEncryptSave;
    free(): void;
    getEmitter(): EventEmitter;
    getHandle(): any;
    getLibrary(): any; // ffi.Library
    hasCrypto(): boolean;
    hasHandle(): boolean;
    isStarted(): boolean;
    isTcp(): boolean;
    isUdp(): boolean;
    old(): ToxOld; // May also return undefined
    off(name: string, callback: Function): void;
    on(name: string, callback?: Function): void;
    saveToFile(filepath: string, callback?: ErrorCallback): void;
    saveToFileSync(filepath: string): void;
    start(wait?: number): void;
    stop(): void;

    addFriend(addr: Buffer, message: string, callback?: NumberCallback): void;
    addFriend(addr: string, message: string, callback?: NumberCallback): void;
    addFriendSync(addr: Buffer, message: string): number;
    addFriendSync(addr: string, message: string): number;
    addFriendNoRequest(publicKey: Buffer, callback?: NumberCallback): void;
    addFriendNoRequest(publicKey: string, callback?: NumberCallback): void;
    addFriendNoRequestSync(publicKey: Buffer): number;
    addFriendNoRequestSync(publicKey: string): number;
    addTCPRelay(address: string, port: number, publicKey: Buffer, callback?: ErrorCallback): void;
    addTCPRelay(address: string, port: number, publicKey: string, callback?: ErrorCallback): void;
    addTCPRelaySync(address: string, port: number, publicKey: Buffer): void;
    addTCPRelaySync(address: string, port: number, publicKey: string): void;
    bootstrap(address: string, port: number, publicKey: string, callback?: ErrorCallback): void;
    bootstrap(address: string, port: number, publicKey: Buffer, callback?: ErrorCallback): void;
    bootstrapSync(address: string, port: number, publicKey: string): void;
    bootstrapSync(address: string, port: number, publicKey: Buffer): void;
    // todo: control: (number|string)
    controlFile(friendnum: number, filenum: number, control: number, callback?: ErrorCallback): void;
    controlFileSync(friendnum: number, filenum: number, control: number|string): void;
    deleteFriend(friendnum: number, callback?: ErrorCallback): void;
    deleteFriendSync(friendnum: number): void;
    getAddress(callback?: BufferCallback): void;
    getAddressSync(): Buffer;
    getAddressHex(callback?: StringCallback): void;
    getAddressHexSync(): string;
    getConnectionStatus(callback?: NumberCallback): void;
    getConnectionStatusSync(): number;
    getFileId(friendnum: number, filenum: number, callback?: BufferCallback): void;
    getFileIdSync(friendnum: number, filenum: number): Buffer;
    getFriendByPublicKey(publicKey: Buffer, callback?: NumberCallback): void;
    getFriendByPublicKey(publicKey: string, callback?: NumberCallback): void;
    getFriendByPublicKeySync(publicKey: Buffer): number;
    getFriendByPublicKeySync(publicKey: string): number;
    getFriendConnectionStatus(friendnum: number, callback?: NumberCallback): void;
    getFriendConnectionStatusSync(friendnum: number): number;
    getFriendLastOnline(friendnum: number, callback?: DateCallback): void;
    getFriendLastOnlineSync(friendnum: number): Date;
    getFriendListSize(callback?: NumberCallback): void;
    getFriendListSizeSync(): number;
    getFriendList(callback?: NumberArrayCallback): void;
    getFriendListSync(): number[];
    getFriendName(friendnum: number, callback?: StringCallback): void;
    getFriendNameSync(friendnum: number): string;
    getFriendNameSize(friendnum: number, callback?: NumberCallback): void;
    getFriendNameSizeSync(friendnum: number): number;
    getFriendPublicKey(friendnum: number, callback?: BufferCallback): void;
    getFriendPublicKeySync(friendnum: number): Buffer;
    getFriendPublicKeyHex(friendnum: number, callback?: StringCallback): void;
    getFriendPublicKeyHexSync(friendnum: number): string;
    getFriendStatus(friendnum: number, callback?: NumberCallback): void;
    getFriendStatusSync(friendnum: number): number;
    getFriendStatusMessage(friendnum: number, callback?: StringCallback): void;
    getFriendStatusMessageSync(friendnum: number): string;
    getFriendStatusMessageSize(friendnum: number, callback?: NumberCallback): void;
    getFriendStatusMessageSizeSync(friendnum: number): number;
    getName(callback?: StringCallback): void;
    getNameSync(): string;
    getNameSize(callback?: NumberCallback): void;
    getNameSizeSync(): number;
    getNospam(callback?: NumberCallback): void;
    getNospamSync(): number;
    getPublicKey(callback?: BufferCallback): void;
    getPublicKeySync(): Buffer;
    getPublicKeyHex(callback?: StringCallback): void;
    getPublicKeyHexSync(): string;
    getSavedata(callback?: BufferCallback): void;
    getSavedataSync(): Buffer;
    getSavedataSize(callback?: NumberCallback): void;
    getSavedataSizeSync(): number;
    getSecretKey(callback?: BufferCallback): void;
    getSecretKeySync(): Buffer;
    getSecretKeyHex(callback?: StringCallback): void;
    getSecretKeyHexSync(): string;
    getStatus(callback?: NumberCallback): void;
    getStatusSync(): number;
    getStatusMessage(callback?: StringCallback): void;
    getStatusMessageSync(): string;
    getStatusMessageSize(callback?: NumberCallback): void;
    getStatusMessageSizeSync(): number;
    getTcpPort(callback?: NumberCallback): void;
    getTcpPortSync(): number;
    getUdpPort(callback?: NumberCallback): void;
    getUdpPortSync(): number;
    hash(buf: Buffer, callback?: BufferCallback): void;
    hashSync(buf: Buffer): Buffer;
    hash(buf: string, callback?: BufferCallback): void;
    hashSync(buf: string): Buffer;
    hasFriend(friendnum: number, callback?: BooleanCallback): void;
    hasFriendSync(friendnum: number): boolean;
    iterate(callback?: ErrorCallback): void;
    iterateSync(): void;
    iterationInterval(callback?: NumberCallback): void;
    iterationIntervalSync(): number;
    kill(callback?: ErrorCallback): void;
    killSync(): void;
    seekFile(friendnum: number, filenum: number, position: number, callback?: ErrorCallback): void;
    seekFileSync(friendnum: number, filenum: number, position: number): void;
    // Todo: fileid should be optional
    sendFile(friendnum: number, kind: number, filename: string, size: number, fileid: Buffer, callback?: NumberCallback): void;
    sendFileSync(friendnum: number, kind: number, filename: string, size: number, fileid?: Buffer): number;
    sendFileChunk(friendnum: number, filenum: number, position: number, data: Buffer, callback?: ErrorCallback): void;
    sendFileChunkSync(friendnum: number, filenum: number, position: number, data: Buffer): void;
    // Todo: Support more than just string 'type' for sendFriendMessage
    sendFriendMessage(friendnum: number, message: string, callback?: NumberCallback): void;
    sendFriendMessage(friendnum: number, message: string, type: string, callback?: NumberCallback): void;
    sendFriendMessageSync(friendnum: number, message: string, type?: string): number;
    sendLosslessPacket(friendnum: number, data: Buffer, callback?: ErrorCallback): void;
    sendLosslessPacket(friendnum: number, id: number, data: Buffer, callback?: ErrorCallback): void;
    sendLosslessPacketSync(friendnum: number, data: Buffer): void;
    sendLosslessPacketSync(friendnum: number, id: number, data: Buffer): void;
    sendLossyPacket(friendnum: number, data: Buffer, callback?: ErrorCallback): void;
    sendLossyPacket(friendnum: number, id: number, data: Buffer, callback?: ErrorCallback): void;
    sendLossyPacketSync(friendnum: number, data: Buffer): void;
    sendLossyPacketSync(friendnum: number, id: number, data: Buffer): void;
    setName(name: string, callback?: ErrorCallback): void;
    setNameSync(name: string): void;
    setNospam(nospam: number, callback?: ErrorCallback): void;
    setNospamSync(nospam: number): void;
    setStatus(status: number, callback?: ErrorCallback): void;
    setStatusSync(status: number): void;
    setStatusMessage(status: string, callback?: ErrorCallback): void;
    setStatusMessageSync(status: string): void;
    setTyping(friendnum: number, typing: boolean, callback?: ErrorCallback): void;
    setTypingSync(friendnum: number, typing: boolean): void;
    versionMajor(callback?: NumberCallback): void;
    versionMajorSync(): number;
    versionMinor(callback?: NumberCallback): void;
    versionMinorSync(): number;
    versionPatch(callback?: NumberCallback): void;
    versionPatchSync(): number;
  }

  interface ToxOldConstructorOptions {
    path?: string;
    tox: Tox;
  }

  export class ToxOld {
    constructor(opts?: ToxOldConstructorOptions);
    createLibrary(libpath?: string): any; // ffi.Library
    getEmitter(): EventEmitter;
    getHandle(): any;
    getLibrary(): any; // ffi.Library
    hasHandle(): boolean;
    off(name: string, callback: Function): void;
    on(name: string, callback?: Function): void;
    tox(): Tox;

    addGroupchat(callback?: NumberCallback): void;
    addGroupchatSync(): number;
    deleteGroupchat(groupnum: number, callback?: ErrorCallback): void;
    deleteGroupchatSync(groupnum: number): void;
    getGroupchats(callback?: NumberArrayCallback): void;
    getGroupchatsSync(): number[];
    getGroupchatCount(callback?: NumberCallback): void;
    getGroupchatCountSync(): number;
    getGroupchatPeername(groupnum: number, peernum: number, callback?: StringCallback): void;
    getGroupchatPeernameSync(groupnum: number, peernum: number): string;
    getGroupchatPeerCount(groupnum: number, callback?: NumberCallback): void;
    getGroupchatPeerCountSync(groupnum: number): number;
    getGroupchatPeerNames(groupnum: number, callback?: StringArrayCallback): void;
    getGroupchatPeerNamesSync(groupnum: number): string[];
    getGroupchatPeerPublicKey(groupnum: number, peernum: number, callback?: BufferCallback): void;
    getGroupchatPeerPublicKeySync(groupnum: number, peernum: number): Buffer;
    getGroupchatPeerPublicKeyHex(groupnum: number, peernum: number, callback?: StringCallback): void;
    getGroupchatPeerPublicKeyHexSync(groupnum: number, peernum: number): string;
    getGroupchatTitle(groupnum: number, callback?: StringCallback): void;
    getGroupchatTitleSync(groupnum: number): string;
    invite(friendnum: number, groupnum: number, callback?: ErrorCallback): void;
    inviteSync(friendnum: number, groupnum: number): void;
    joinGroupchat(friendnum: number, data: Buffer, callback?: ErrorCallback): void;
    joinGroupchatSync(friendnum: number, data: Buffer): number;
    peernumberIsOurs(groupnum: number, peernum: number, callback?: BooleanCallback): void;
    peernumberIsOursSync(groupnum: number, peernum: number): boolean;
    sendGroupchatAction(groupnum: number, action: string, callback?: ErrorCallback): void;
    sendGroupchatActionSync(groupnum: number, action: string): void;
    sendGroupchatMessage(groupnum: number, message: string, callback?: ErrorCallback): void;
    sendGroupchatMessageSync(groupnum: number, message: string): void;
    setGroupchatTitle(groupnum: number, title: string, callback?: ErrorCallback): void;
    setGroupchatTitleSync(groupnum: number, title: string): void;
  }
  
  export var Consts : {
    TOX_KEY_SIZE: number, //32,
    TOX_FRIEND_ADDRESS_SIZE: number, //(32 + 6),
  
    TOX_PUBLIC_KEY_SIZE: number, //32,
    TOX_SECRET_KEY_SIZE: number, //32,
    TOX_ADDRESS_SIZE: number, //(32 + 6),
    TOX_MAX_NAME_LENGTH: number, //128,
    TOX_MAX_STATUS_MESSAGE_LENGTH: number //1007,
    TOX_MAX_FRIEND_REQUEST_LENGTH: number, //1016,
    TOX_MAX_MESSAGE_LENGTH: number, //1372,
    TOX_MAX_CUSTOM_PACKET_SIZE: number, //1373,
    TOX_HASH_LENGTH: number, //32,
    TOX_FILE_ID_LENGTH: number, //32,
    TOX_MAX_FILENAME_LENGTH: number, //255,
  
    TOX_CONNECTION_NONE: number, //0,
    TOX_CONNECTION_TCP: number, //1,
    TOX_CONNECTION_UDP: number, //2,
  
    TOX_MESSAGE_TYPE_NORMAL: number, //0,
    TOX_MESSAGE_TYPE_ACTION: number, //1,
  
    TOX_USER_STATUS_NONE: number, //0,
    TOX_USER_STATUS_AWAY: number, //1,
    TOX_USER_STATUS_BUSY: number, //2,
  
    TOX_ERR_FILE_CONTROL_OK: number, //0,
    TOX_ERR_FILE_CONTROL_FRIEND_NOT_FOUND: number, //1,
    TOX_ERR_FILE_CONTROL_FRIEND_NOT_CONNECTED: number, //2,
    TOX_ERR_FILE_CONTROL_NOT_FOUND: number, //3,
    TOX_ERR_FILE_CONTROL_NOT_PAUSED: number, //4,
    TOX_ERR_FILE_CONTROL_DENIED: number, //5,
    TOX_ERR_FILE_CONTROL_ALREADY_PAUSED: number, //6,
    TOX_ERR_FILE_CONTROL_SENDQ: number, //7,
  
    TOX_ERR_FILE_GET_OK: number, //0,
    TOX_ERR_FILE_GET_FRIEND_NOT_FOUND: number, //1,
    TOX_ERR_FILE_GET_NOT_FOUND: number, //2,
  
    TOX_ERR_FILE_SEEK_OK: number, //0,
    TOX_ERR_FILE_SEEK_FRIEND_NOT_FOUND: number, //1,
    TOX_ERR_FILE_SEEK_FRIEND_NOT_CONNECTED: number, //2,
    TOX_ERR_FILE_SEEK_NOT_FOUND: number, //3,
    TOX_ERR_FILE_SEEK_DENIED: number, //4,
    TOX_ERR_FILE_SEEK_INVALID_POSITION: number, //5,
    TOX_ERR_FILE_SEEK_SENDQ: number, //6,
  
    TOX_ERR_FILE_SEND_OK: number, //0,
    TOX_ERR_FILE_SEND_NULL: number, //1,
    TOX_ERR_FILE_SEND_FRIEND_NOT_FOUND: number, //2,
    TOX_ERR_FILE_SEND_FRIEND_NOT_CONNECTED: number, //3,
    TOX_ERR_FILE_SEND_NAME_TOO_LONG: number, //4,
    TOX_ERR_FILE_SEND_TOO_MANY: number, //5,
  
    TOX_ERR_FILE_SEND_CHUNK_OK: number, //0,
    TOX_ERR_FILE_SEND_CHUNK_NULL: number, //1,
    TOX_ERR_FILE_SEND_CHUNK_FRIEND_NOT_FOUND: number, //2,
    TOX_ERR_FILE_SEND_CHUNK_FRIEND_NOT_CONNECTED: number, //3,
    TOX_ERR_FILE_SEND_CHUNK_NOT_FOUND: number, //4,
    TOX_ERR_FILE_SEND_CHUNK_NOT_TRANSFERRING: number, //5,
    TOX_ERR_FILE_SEND_CHUNK_INVALID_LENGTH: number, //6,
    TOX_ERR_FILE_SEND_CHUNK_SENDQ: number, //7,
    TOX_ERR_FILE_SEND_CHUNK_WRONG_POSITION: number, //8,
  
    TOX_ERR_FRIEND_ADD_OK: number, //0,
    TOX_ERR_FRIEND_ADD_NULL: number, //1,
    TOX_ERR_FRIEND_ADD_TOO_LONG: number, //2,
    TOX_ERR_FRIEND_ADD_NO_MESSAGE: number, //3,
    TOX_ERR_FRIEND_ADD_OWN_KEY: number, //4,
    TOX_ERR_FRIEND_ADD_ALREADY_SENT: number, //5,
    TOX_ERR_FRIEND_ADD_BAD_CHECKSUM: number, //6,
    TOX_ERR_FRIEND_ADD_SET_NEW_NOSPAM: number, //7,
    TOX_ERR_FRIEND_ADD_MALLOC: number, //8,
  
    TOX_ERR_FRIEND_CUSTOM_PACKET_OK: number, //0,
    TOX_ERR_FRIEND_CUSTOM_PACKET_NULL: number, //1,
    TOX_ERR_FRIEND_CUSTOM_PACKET_FRIEND_NOT_FOUND: number, //2,
    TOX_ERR_FRIEND_CUSTOM_PACKET_FRIEND_NOT_CONNECTED: number, //3,
    TOX_ERR_FRIEND_CUSTOM_PACKET_INVALID: number, //4,
    TOX_ERR_FRIEND_CUSTOM_PACKET_EMPTY: number, //5,
    TOX_ERR_FRIEND_CUSTOM_PACKET_TOO_LONG: number, //6,
    TOX_ERR_FRIEND_CUSTOM_PACKET_SENDQ: number, //7,
  
    TOX_ERR_FRIEND_DELETE_OK: number, //0,
    TOX_ERR_FRIEND_DELETE_FRIEND_NOT_FOUND: number, //1,
  
    TOX_ERR_FRIEND_GET_LAST_ONLINE_OK: number, //0,
    TOX_ERR_FRIEND_GET_LAST_ONLINE_FRIEND_NOT_FOUND: number, //1,
  
    TOX_ERR_FRIEND_QUERY_OK: number, //0,
    TOX_ERR_FRIEND_QUERY_NULL: number, //1,
    TOX_ERR_FRIEND_QUERY_FRIEND_NOT_FOUND: number, //2,
  
    TOX_ERR_FRIEND_SEND_MESSAGE_OK: number, //0,
    TOX_ERR_FRIEND_SEND_MESSAGE_NULL: number, //1,
    TOX_ERR_FRIEND_SEND_MESSAGE_FRIEND_NOT_FOUND: number, //2,
    TOX_ERR_FRIEND_SEND_MESSAGE_FRIEND_NOT_CONNECTED: number, //3,
    TOX_ERR_FRIEND_SEND_MESSAGE_SENDQ: number, //4,
    TOX_ERR_FRIEND_SEND_MESSAGE_TOO_LONG: number, //5,
    TOX_ERR_FRIEND_SEND_MESSAGE_EMPTY: number, //6,
  
    TOX_ERR_NEW_OK: number, //0,
    TOX_ERR_NEW_NULL: number, //1,
    TOX_ERR_NEW_MALLOC: number, //2,
    TOX_ERR_NEW_PORT_ALLOC: number, //3,
    TOX_ERR_NEW_PROXY_TYPE: number, //4,
    TOX_ERR_NEW_PROXY_BAD_HOST: number, //5,
    TOX_ERR_NEW_PROXY_BAD_PORT: number, //6,
    TOX_ERR_NEW_PROXY_NOT_FOUND: number, //7,
    TOX_ERR_NEW_LOAD_ENCRYPTED: number, //8,
    TOX_ERR_NEW_LOAD_DECRYPTION_FAILED: number, //9,
    TOX_ERR_NEW_LOAD_BAD_FORMAT: number, //10,
  
    TOX_ERR_OPTIONS_NEW_OK: number, //0,
    TOX_ERR_OPTIONS_NEW_MALLOC: number, //1,
  
    TOX_ERR_BOOTSTRAP_OK: number, //0,
    TOX_ERR_BOOTSTRAP_NULL: number, //1,
    TOX_ERR_BOOTSTRAP_BAD_HOST: number, //2,
    TOX_ERR_BOOTSTRAP_BAD_PORT: number, //3,
  
    TOX_ERR_FRIEND_BY_PUBLIC_KEY_OK: number, //0,
    TOX_ERR_FRIEND_BY_PUBLIC_KEY_NULL: number, //1,
    TOX_ERR_FRIEND_BY_PUBLIC_KEY_NOT_FOUND: number, //2,
  
    TOX_ERR_FRIEND_GET_PUBLIC_KEY_OK: number, //0,
    TOX_ERR_FRIEND_GET_PUBLIC_KEY_FRIEND_NOT_FOUND: number, //1,
  
    TOX_ERR_GET_PORT_OK: number, //0,
    TOX_ERR_GET_PORT_NOT_BOUND: number, //1,
  
    TOX_ERR_SET_INFO_OK: number, //0,
    TOX_ERR_SET_INFO_NULL: number, //1,
    TOX_ERR_SET_INFO_TOO_LONG: number, //2,
  
    TOX_ERR_SET_TYPING_OK: number, //0,
    TOX_ERR_SET_TYPING_FRIEND_NOT_FOUND: number, //1,
  
    TOX_FILE_KIND_DATA: number, //0,
    TOX_FILE_KIND_AVATAR: number, //1,
  
    TOX_FILE_CONTROL_RESUME: number, //0,
    TOX_FILE_CONTROL_PAUSE: number, //1,
    TOX_FILE_CONTROL_CANCEL: number, //2,
  
    TOX_PROXY_TYPE_NONE: number, //0,
    TOX_PROXY_TYPE_HTTP: number, //1,
    TOX_PROXY_TYPE_SOCKS5: number, //2,
  
    TOX_SAVEDATA_TYPE_NONE: number, //0,
    TOX_SAVEDATA_TYPE_TOX_SAVE: number, //1,
    TOX_SAVEDATA_TYPE_SECRET_KEY: number, //2

    TOX_PASS_KEY_LENGTH: number, //32,
    TOX_PASS_SALT_LENGTH: number, //32,
    TOX_PASS_ENCRYPTION_EXTRA_LENGTH: number, //80,

    TOX_ERR_DECRYPTION_OK: number, //0,
    TOX_ERR_DECRYPTION_NULL: number, //1,
    TOX_ERR_DECRYPTION_INVALID_LENGTH: number, //2,
    TOX_ERR_DECRYPTION_BAD_FORMAT: number, //3,
    TOX_ERR_DECRYPTION_KEY_DERIVATION_FAILED: number, //4,
    TOX_ERR_DECRYPTION_FAILED: number, //5,

    TOX_ERR_ENCRYPTION_OK: number, //0,
    TOX_ERR_ENCRYPTION_NULL: number, //1,
    TOX_ERR_ENCRYPTION_KEY_DERIVATION_FAILED: number, //2,
    TOX_ERR_ENCRYPTION_FAILED: number, //3,

    TOX_ERR_KEY_DERIVATION_OK: number, //0,
    TOX_ERR_KEY_DERIVATION_NULL: number, //1,
    TOX_ERR_KEY_DERIVATION_FAILED: number, //2
  }
}
