import { CID } from "kubo-rpc-client/";
import { IPFS } from "kubo-rpc-client/dist/src/types";
import OrbitDB from "orbit-db";
import EventStore from "orbit-db-eventstore";
export interface ShareLogEntry {
    recipients: string[];
    message: string;
    shareCID: CID;
    recipientNames: string[];
    senderName: string;
    senderId: string;
}
export declare class ShareLog<T> {
    _storeAddress: string;
    _orbitdb: OrbitDB;
    _ipfs: IPFS;
    store: EventStore<T>;
    localSharedWithMeStore: EventStore<T>;
    localSharedWithMeStoreAdreess: string;
    localSharedWithOthersStore: EventStore<T>;
    localSharedWithOthersStoreAddress: string;
    private static openStoreOptions;
    private static openLocalStoreOptions;
    private static createStoreOptions;
    private static createLocalStoreOptions;
    constructor(ipfs: IPFS, orbitdb: OrbitDB, storeAddress: string);
    open(): Promise<void>;
    create(): Promise<void>;
    close(): Promise<void>;
    addShare(share: T): Promise<string>;
    getShare(shareLogEntryHash: string): LogEntry<T> | undefined;
}
export declare class IPFShareLog extends ShareLog<ShareLogEntry> {
    open(): Promise<void>;
    ensureLocalUpToDate(): Promise<void>;
    create(): Promise<void>;
    close(): Promise<void>;
    onNewShare(): Promise<void>;
}
