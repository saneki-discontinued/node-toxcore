// Type definitions for toxcore 1.0.1
// Project: https://github.com/saneki/node-toxcore
// Definitions by: saneki <https://github.com/saneki>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module 'toxcore' {
  import events = require('events');
  import EventEmitter = events.EventEmitter;

  interface ToxConstructorOptions {
    path?: string;
  }

  interface ToxOldConstructorOptions {
    path?: string;
    tox: Tox;
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

  interface DateCallback extends ErrorCallback {
    (err?: Error, val?: Date): void;
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

  // Leaving out freeOptions/newOptions functions
  export class Tox {
    constructor(opts?: ToxConstructorOptions);
    createLibrary(libpath?: string): any; // ffi.Library
    free(): void;
    // getEmitter(): EventEmitter; // Add later?
    getHandle(): any;
    getLibrary(): any; // ffi.Library
    hasHandle(): boolean;
    isStarted(): boolean;
    isTcp(): boolean;
    isUdp(): boolean;
    old(): ToxOld; // May also return undefined
    off(name: string, callback: Function): void;
    on(name: string, callback?: Function): void;
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
    deleteFriend(friendnum: number, callback?: ErrorCallback): void;
    deleteFriendSync(friendnum: number): void;
    getAddress(callback?: BufferCallback): void;
    getAddressSync(): Buffer;
    getAddressHex(callback?: StringCallback): void;
    getAddressHexSync(): string;
    getConnectionStatus(callback?: NumberCallback): void;
    getConnectionStatusSync(): number;
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
    //hash(buf: Buffer, callback?: BufferCallback): void;
    //hashSync(buf: Buffer): Buffer;
    //hash(buf: string, callback?: BufferCallback): void;
    //hashSync(buf: string): Buffer;
    hasFriend(friendnum: number, callback?: BooleanCallback): void;
    hasFriendSync(friendnum: number): boolean;
    iterate(callback?: ErrorCallback): void;
    iterateSync(): void;
    iterationInterval(callback?: NumberCallback): void;
    iterationIntervalSync(): number;
    kill(callback?: ErrorCallback): void;
    killSync(): void;
    //saveToFile(filepath: string, callback?: ErrorCallback): void;
    //saveToFileSync(filepath: string): void;
    // Todo: Support more than just string 'type' for sendFriendMessage
    sendFriendMessage(friendnum: number, message: string, callback?: NumberCallback): void;
    sendFriendMessage(friendnum: number, message: string, type: string, callback?: NumberCallback): void;
    sendFriendMessageSync(friendnum: number, message: string, type?: string): number;
    sendLosslessPacket(friendnum: number, data: Buffer, callback?: ErrorCallback): void;
    sendLosslessPacketSync(friendnum: number, data: Buffer): void;
    sendLossyPacket(friendnum: number, data: Buffer, callback?: ErrorCallback): void;
    sendLossyPacketSync(friendnum: number, data: Buffer): void;
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

  export class ToxOld {
    constructor(opts?: ToxOldConstructorOptions);
    createLibrary(libpath?: string): any; // ffi.Library
    // getEmitter(): EventEmitter; // Add later?
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
}
