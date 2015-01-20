// Type definitions for toxcore 0.0.7
// Project: https://github.com/saneki/node-toxcore
// Definitions by: saneki <https://github.com/saneki>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module 'toxcore' {
  interface ToxConstructorOptions {
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
    new();
    new(opts?: ToxConstructorOptions);
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
    deleteFriend(friendnum: number, callback?: BooleanCallback): void;
    deleteFriendSync(friendnum: number): boolean;
    deleteGroupchat(groupnum: number, callback?: BooleanCallback): void;
    deleteGroupchatSync(groupnum: number): boolean;
    do(callback?: ErrorCallback): void;
    doSync(): void;
    getAddress(callback?: BufferCallback): void;
    getAddressSync(): Buffer;
    getAddressHex(callback?: StringCallback): void;
    getAddressHexSync(): string;
    getDoInterval(callback?: NumberCallback): void;
    getDoIntervalSync(): number;
    getFileDataRemaining(friendnum: number, filenum: number, sendReceive: number, callback?: NumberCallback): void;
    getFileDataRemainingSync(friendnum: number, filenum: number, sendReceive: number): number;
    getFileDataSize(friendnum: number, callback?: NumberCallback): void;
    getFileDataSizeSync(friendnum: number): number;
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
    getGroupchatTitle(groupnum: number, callback?: StringCallback): void;
    getGroupchatTitleSync(groupnum: number): string;
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
    joinGroupchat(friendnum: number, data: Buffer, callback?: ErrorCallback): void;
    joinGroupchatSync(friendnum: number, data: Buffer): number;
    kill(callback?: ErrorCallback): void;
    killSync(): void;
    invite(friendnum: number, groupnum: number, callback?: BooleanCallback): void;
    inviteSync(friendnum: number, groupnum: number): boolean;
    load(buffer: Buffer, callback?: NumberCallback): void;
    loadSync(buffer: Buffer): number;
    loadFromFile(filepath: string, callback?: ErrorCallback): void;
    newFileSender(friendnum: number, filesize: number, filename: string, callback?: NumberCallback): void;
    newFileSenderSync(friendnum: number, filesize: number, filename: string): number;
    on(name: string, callback?: Function): void;
    peernumberIsOurs(groupnum: number, peernum: number, callback?: BooleanCallback): void;
    peernumberIsOursSync(groupnum: number, peernum: number): boolean;
    requestAvatarData(friendnum: number, callback?: BooleanCallback): void;
    requestAvatarDataSync(friendnum: number): boolean;
    requestAvatarInfo(friendnum: number, callback?: BooleanCallback): void;
    requestAvatarInfoSync(friendnum: number): boolean;
    save(callback?: BufferCallback): void;
    saveSync(): Buffer;
    saveToFile(filepath: string, callback?: ErrorCallback): void;
    sendFileControl(friendnum: number, sendReceive: number, filenum: number, messageId: number, data: Buffer, callback?: ErrorCallback): void;
    sendFileControlSync(friendnum: number, sendReceive: number, filenum: number, messageId: number, data: Buffer): void;
    sendFileData(friendnum: number, filenum: number, data: Buffer, callback?: ErrorCallback): void;
    sendFileDataSync(friendnum: number, filenum: number, data: Buffer): void;
    sendGroupchatAction(groupnum: number, action: string, callback?: ErrorCallback): void;
    sendGroupchatActionSync(groupnum: number, action: string): boolean;
    sendGroupchatMessage(groupnum: number, message: string, callback?: ErrorCallback): void;
    sendGroupchatMessageSync(groupnum: number, message: string): boolean;
    sendMessage(message: string, friend: number, callback?: NumberCallback): void;
    sendMessageSync(message: string, friend: number): number;
    setAvatar(format: number, buffer: Buffer, callback?: BooleanCallback): void;
    setAvatarSync(format: number, buffer: Buffer): boolean;
    setGroupchatTitle(groupnum: number, title: string, callback?: ErrorCallback): void;
    setGroupchatTitleSync(groupnum: number, title: string): void;
    setName(name: string, callback?: BooleanCallback): void;
    setNameSync(name: string): boolean;
    setStatusMessage(status: string, callback?: BooleanCallback): void;
    setStatusMessageSync(status: string): boolean;
    setUserStatus(status: number, callback?: BooleanCallback): void;
    setUserStatusSync(status: number): boolean;
    size(callback?: NumberCallback): void;
    sizeSync(): number;
    unsetAvatar(callback?: BooleanCallback): void;
    unsetAvatarSync(): boolean;
  }
}
