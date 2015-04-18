// Type definitions for toxcore 0.0.18
// Project: https://github.com/saneki/node-toxcore
// Definitions by: saneki <https://github.com/saneki>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module 'toxcore' {
  import events = require('events');
  import EventEmitter = events.EventEmitter;

  interface ToxConstructorOptions {
    path?: string;
  }

  interface ToxAVConstructorOptions {
    path?: string;
  }

  interface ToxDnsConstructorOptions {
    path?: string;
    key?: Buffer; // Or string?
  }

  interface ToxEncryptSaveConstructorOptions {
    path?: string;
  }

  interface ErrorCallback {
    (err?: Error): void;
  }

  interface BooleanCallback extends ErrorCallback {
    (err?: Error, val?: boolean): void;
  }

  interface BufferCallback extends ErrorCallback {
    (err?: Error, val?: Buffer): void;
  }

  interface NumberCallback extends ErrorCallback {
    (err?: Error, val?: number): void;
  }

  interface StringCallback extends ErrorCallback {
    (err?: Error, val?: string): void;
  }

  interface NumberArrayCallback extends ErrorCallback {
    (err?: Error, list?: number[]): void;
  }

  interface StringArrayCallback extends ErrorCallback {
    (err?: Error, list?: string[]): void;
  }

  interface ToxKeysCallback extends ErrorCallback {
    (err?: Error, publicBuf?: Buffer, privateBuf?: Buffer): void;
  }

  export class Tox {
    constructor();
    constructor(opts?: ToxConstructorOptions);
    checkHandle(callback?: ErrorCallback): boolean;
    checkHandleSync(): void;
    clearHandle(): void;
    createCoreLibrary(libpath?: string): any; // Returns a node-ffi Library type
    hasHandle(): boolean;

    // Wrapper functions
    // -----------------

    addFriend(addr: string, message: string, callback?: NumberCallback): void;
    addFriendSync(addr: string, message: string): number;
    addFriendNoRequest(publicKey: Buffer, callback?: NumberCallback): void;
    addFriendNoRequestSync(publicKey: Buffer): number;
    addGroupchat(callback?: NumberCallback): void;
    addGroupchatSync(): number;
    addTCPRelay(address: string, port: number, publicKey: string, callback?: ErrorCallback): void;
    addTCPRelay(address: string, port: number, publicKey: Buffer, callback?: ErrorCallback): void;
    addTCPRelaySync(address: string, port: number, publicKey: string): void;
    addTCPRelaySync(address: string, port: number, publicKey: Buffer): void;
    bootstrapFromAddress(address: string, port: number, publicKey: string, callback?: ErrorCallback): void;
    bootstrapFromAddress(address: string, port: number, publicKey: Buffer, callback?: ErrorCallback): void;
    bootstrapFromAddressSync(address: string, port: number, publicKey: string): void;
    bootstrapFromAddressSync(address: string, port: number, publicKey: Buffer): void;
    countFriendList(callback?: NumberCallback): void;
    countFriendListSync(): number;
    deleteFriend(friendnum: number, callback?: ErrorCallback): void;
    deleteFriendSync(friendnum: number): void;
    deleteGroupchat(groupnum: number, callback?: ErrorCallback): void;
    deleteGroupchatSync(groupnum: number): void;
    do(callback?: ErrorCallback): void;
    doSync(): void;
    getAddress(callback?: BufferCallback): void;
    getAddressSync(): Buffer;
    getAddressHex(callback?: StringCallback): void;
    getAddressHexSync(): string;
    getAV(): any; // CHANGE ME LATER
    getDoInterval(callback?: NumberCallback): void;
    getDoIntervalSync(): number;
    getEmitter(): EventEmitter;
    getFileDataRemaining(friendnum: number, filenum: number, sendReceive: number, callback?: NumberCallback): void;
    getFileDataRemainingSync(friendnum: number, filenum: number, sendReceive: number): number;
    getFileDataSize(friendnum: number, callback?: NumberCallback): void;
    getFileDataSizeSync(friendnum: number): number;
    getFriendConnectionStatus(friendnum: number, callback?: BooleanCallback): void;
    getFriendConnectionStatusSync(friendnum: number): boolean;
    getFriendLastOnline(friendnum: number, callback?: NumberCallback): void;
    getFriendLastOnlineSync(friendnum: number): number;
    getFriendList(callback?: NumberArrayCallback): void;
    getFriendListSync(): number[];
    getFriendName(friendnum: number, callback?: StringCallback): void;
    getFriendNameSync(friendnum: number): string;
    getFriendPublicKey(friendnum: number, callback?: BufferCallback): void;
    getFriendPublicKeySync(friendnum: number): Buffer;
    getFriendPublicKeyHex(friendnum: number, callback?: StringCallback): void;
    getFriendPublicKeyHexSync(friendnum: number): string;
    getFriendStatusMessage(friendnum: number, callback?: StringCallback): void;
    getFriendStatusMessageSync(friendnum: number): string;
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
    getHandle(): any;
    getKeys(includePriv: boolean, callback?: ToxKeysCallback): void;
    getKeysSync(includePriv: boolean): Buffer[];
    getName(callback?: StringCallback): void;
    getNameSync(): string;
    getPrivateKey(callback?: BufferCallback): void;
    getPrivateKeySync(): Buffer;
    getPrivateKeyHex(callback?: StringCallback): void;
    getPrivateKeyHexSync(): string;
    getPublicKey(callback?: BufferCallback): void;
    getPublicKeySync(): Buffer;
    getPublicKeyHex(callback?: StringCallback): void;
    getPublicKeyHexSync(): string;
    getStatusMessage(callback?: StringCallback): void;
    getStatusMessageSync(): string;
    getUserStatus(callback?: NumberCallback): void;
    getUserStatusSync(): number;
    hash(buf: Buffer, callback?: BufferCallback): void;
    hashSync(buf: Buffer): Buffer;
    hash(buf: string, callback?: BufferCallback): void;
    hashSync(buf: string): Buffer;
    hasFriend(callback?: BooleanCallback): void;
    hasFriendSync(): boolean;
    isConnected(callback?: BooleanCallback): void;
    isConnectedSync(): boolean;
    isStarted(): boolean;
    joinGroupchat(friendnum: number, data: Buffer, callback?: ErrorCallback): void;
    joinGroupchatSync(friendnum: number, data: Buffer): number;
    kill(callback?: ErrorCallback): void;
    killSync(): void;
    invite(friendnum: number, groupnum: number, callback?: ErrorCallback): void;
    inviteSync(friendnum: number, groupnum: number): void;
    load(buffer: Buffer, callback?: NumberCallback): void;
    loadSync(buffer: Buffer): number;
    loadFromFile(filepath: string, callback?: ErrorCallback): void;
    loadFromFileSync(filepath: string): void;
    newFileSender(friendnum: number, filesize: number, filename: string, callback?: NumberCallback): void;
    newFileSenderSync(friendnum: number, filesize: number, filename: string): number;
    on(name: string, callback?: Function): void;
    off(name: string, callback: Function): void;
    peernumberIsOurs(groupnum: number, peernum: number, callback?: BooleanCallback): void;
    peernumberIsOursSync(groupnum: number, peernum: number): boolean;
    requestAvatarData(friendnum: number, callback?: ErrorCallback): void;
    requestAvatarDataSync(friendnum: number): void;
    requestAvatarInfo(friendnum: number, callback?: ErrorCallback): void;
    requestAvatarInfoSync(friendnum: number): void;
    save(callback?: BufferCallback): void;
    saveSync(): Buffer;
    saveToFile(filepath: string, callback?: ErrorCallback): void;
    saveToFileSync(filepath: string): void;
    sendAction(friendnum: number, action: string, callback?: NumberCallback): void;
    sendActionSync(friendnum: number, action: string): number;
    sendFileControl(friendnum: number, sendReceive: number, filenum: number, messageId: number, data: Buffer, callback?: ErrorCallback): void;
    sendFileControlSync(friendnum: number, sendReceive: number, filenum: number, messageId: number, data: Buffer): void;
    sendFileData(friendnum: number, filenum: number, data: Buffer, callback?: ErrorCallback): void;
    sendFileDataSync(friendnum: number, filenum: number, data: Buffer): void;
    sendGroupchatAction(groupnum: number, action: string, callback?: ErrorCallback): void;
    sendGroupchatActionSync(groupnum: number, action: string): void;
    sendGroupchatMessage(groupnum: number, message: string, callback?: ErrorCallback): void;
    sendGroupchatMessageSync(groupnum: number, message: string): void;
    sendMessage(friendnum: number, message: string, callback?: NumberCallback): void;
    sendMessageSync(friendnum: number, message: string): number;
    setAvatar(format: number, buffer: Buffer, callback?: ErrorCallback): void;
    setAvatarSync(format: number, buffer: Buffer): void;
    setGroupchatTitle(groupnum: number, title: string, callback?: ErrorCallback): void;
    setGroupchatTitleSync(groupnum: number, title: string): void;
    setName(name: string, callback?: ErrorCallback): void;
    setNameSync(name: string): void;
    setStatusMessage(status: string, callback?: ErrorCallback): void;
    setStatusMessageSync(status: string): void;
    setUserStatus(status: number, callback?: ErrorCallback): void;
    setUserStatusSync(status: number): void;
    size(callback?: NumberCallback): void;
    sizeSync(): number;
    start(wait?: number): void;
    stop(): void;
    unsetAvatar(callback?: ErrorCallback): void;
    unsetAvatarSync(): void;
  }

  export class ToxAV {
    constructor(tox: Tox, opts?: ToxAVConstructorOptions);
    getTox(): Tox;
    addGroupchat(callback?: NumberCallback): void;
    addGroupchatSync(): number;
    joinGroupchat(friendnum: number, data: Buffer, callback?: NumberCallback): void;
    joinGroupchatSync(friendnum: number, data: Buffer): number;
  }

  export class ToxDns {
    constructor(opts?: ToxDnsConstructorOptions);
    kill(callback?: ErrorCallback): void;
    killSync(): void;
    generateString(name: string, callback?: Function): void; // Todo: fix
    decrypt(record: string, requestId: number, callback?: BufferCallback): void;
  }

  export class ToxEncryptSave {
    constructor(tox: Tox, opts?: ToxEncryptSaveConstructorOptions);
    getEncryptionExtraLength(callback?: NumberCallback): void;
    getEncryptionExtraLengthSync(): number;
    getKeyLength(callback?: NumberCallback): void;
    getKeyLengthSync(): number;
    getSaltLength(callback?: NumberCallback): void;
    getSaltLengthSync(): number;
    getEncryptedSize(callback?: NumberCallback): void;
    getEncryptedSizeSync(): number;
    passEncrypt(data: Buffer, passphrase: string, callback?: BufferCallback): void;
    passEncryptSync(data: Buffer, passphrase: string): Buffer;
    passDecrypt(data: Buffer, passphrase: string, callback?: BufferCallback): void;
    passDecryptSync(data: Buffer, passphrase: string): Buffer;
    encryptedLoad(data: Buffer, passphrase: string, callback?: ErrorCallback): void;
    encryptedLoadSync(data: Buffer, passphrase: string): void;
    encryptedSave(passphrase: string, callback?: BufferCallback): void;
    encryptedSaveSync(passphrase: string): Buffer;
    deriveKeyFromPass(passphrase: string, callback?: BufferCallback): void;
    deriveKeyFromPassSync(passphrase: string): Buffer;
    deriveKeyWithSalt(passphrase: string, salt: Buffer, callback?: BufferCallback): void;
    deriveKeyWithSaltSync(passphrase: string, salt: Buffer): Buffer;
    getSalt(data: Buffer, callback?: BufferCallback): void;
    getSaltSync(data: Buffer): Buffer;
    passKeyEncrypt(data: Buffer, key: Buffer, callback?: BufferCallback): void;
    passKeyEncryptSync(data: Buffer, key: Buffer): Buffer;
    passKeyDecrypt(data: Buffer, key: Buffer, callback?: BufferCallback): void;
    passKeyDecryptSync(data: Buffer, key: Buffer): Buffer;
    encryptedKeySave(key: Buffer, callback?: BufferCallback): void;
    encryptedKeySaveSync(key: Buffer): Buffer;
    encryptedKeyLoad(data: Buffer, key: Buffer, callback?: ErrorCallback): void;
    encryptedKeyLoadSync(data: Buffer, key: Buffer): void;
    isDataEncrypted(data: Buffer, callback?: BooleanCallback): void;
    isDataEncryptedSync(data: Buffer): boolean;
  }

  // ------
  // NewApi
  // ------
  // @todo: Greatly improve this...

  export class NewApiTox {
    constructor();
    bootstrapSync(address: string, port: number, publicKey: Buffer): void;
    bootstrapSync(address: string, port: number, publicKey: string): void;
    isStarted(): boolean;
    kill(callback?: ErrorCallback): void;
    killSync(): void;
    start(wait?: number): void;
    stop(): void;
  }

  export interface NewApi {
    Tox: NewApiTox
  }

  export var newApi: NewApi;
}
