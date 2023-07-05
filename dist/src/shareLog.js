import { logger } from "./common/logger.js";
import clipboardy from "clipboardy";
import notifier from "node-notifier";
function notify(value) {
    notifier.notify({
        title: `IPFShare: ${value.senderName} shared something with you`,
        message: "A new IPFShare is available: click to copy the link to your clipboard",
        open: value.shareCID.toString(),
        sound: true,
        wait: false,
    });
    notifier.on("click", async (notifierObject, options) => {
        await clipboardy.write(value.shareCID.toString());
    });
}
export class ShareLog {
    _storeAddress;
    _orbitdb;
    _ipfs;
    store;
    localSharedWithMeStore;
    localSharedWithMeStoreAdreess;
    localSharedWithOthersStore;
    localSharedWithOthersStoreAddress;
    static openStoreOptions = {
        accessController: { write: ["*"] },
        create: false,
    };
    static openLocalStoreOptions = {
        accessController: { write: ["*"] },
        create: false,
        localOnly: true
    };
    static createStoreOptions = {
        accessController: {
            write: ["*"]
        }, create: true
    };
    static createLocalStoreOptions = {
        accessController: { write: ["*"] },
        create: true,
        localOnly: true
    };
    constructor(ipfs, orbitdb, storeAddress) {
        this._ipfs = ipfs;
        this._orbitdb = orbitdb;
        this._storeAddress = storeAddress;
        this.store = {};
        this.localSharedWithMeStore = {};
        this.localSharedWithOthersStore = {};
        this.localSharedWithMeStoreAdreess = `${this._storeAddress}${this._orbitdb.id}sharedWithMe`;
        this.localSharedWithOthersStoreAddress = `${this._storeAddress}${this._orbitdb.id}sharedWithOthers`;
    }
    async open() {
        this.store = await this._orbitdb.eventlog(this._storeAddress, ShareLog.openStoreOptions);
        this.localSharedWithMeStore =
            await this._orbitdb.eventlog(this.localSharedWithMeStoreAdreess, ShareLog.openLocalStoreOptions);
        this.localSharedWithOthersStore =
            await this._orbitdb.eventlog(this.localSharedWithOthersStoreAddress, ShareLog.openLocalStoreOptions);
        await this.store.load();
        await this.localSharedWithMeStore.load();
        await this.localSharedWithOthersStore.load();
    }
    async create() {
        this.store =
            await this._orbitdb.eventlog(this._storeAddress, ShareLog.createStoreOptions);
        this.localSharedWithMeStore =
            await this._orbitdb.eventlog(this.localSharedWithMeStoreAdreess, ShareLog.createLocalStoreOptions);
        this.localSharedWithOthersStore =
            await this._orbitdb.eventlog(this.localSharedWithOthersStoreAddress, ShareLog.createLocalStoreOptions);
        await this.store.load();
        await this.localSharedWithMeStore.load();
        await this.localSharedWithOthersStore.load();
    }
    async close() {
        await this.store?.close();
    }
    async addShare(share) {
        return await this.store.add(share);
    }
    getShare(shareLogEntryHash) {
        const entry = this.store.get(shareLogEntryHash);
        return entry;
    }
}
export class IPFShareLog extends ShareLog {
    async open() {
        try {
            await super.open();
            await this.ensureLocalUpToDate();
        }
        catch (err) {
            await this.create();
        }
    }
    async ensureLocalUpToDate() {
        await this.localSharedWithMeStore.load();
        await this.localSharedWithOthersStore.load();
        await this.store.load();
        const localSharedWithMeEntries = this.localSharedWithMeStore.iterator().collect();
        const localSharedWithOtherEntries = this.localSharedWithOthersStore.iterator().collect();
        this.store.iterator().collect().forEach((entry) => {
            (async () => {
                if (entry.payload.value.senderId === this._orbitdb.id &&
                    localSharedWithOtherEntries.filter(async (localEntry) => {
                        return localEntry.payload.value.shareCID.toString() === entry.payload.value.shareCID.toString();
                    }).length == 0) {
                    await this.localSharedWithOthersStore.add(entry.payload.value);
                }
                if (entry.payload.value.recipients.includes(this._orbitdb.id)
                    &&
                        entry.payload.value.senderId !== this._orbitdb.id
                    &&
                        localSharedWithMeEntries.filter((localEntry) => localEntry.payload.value.shareCID.toString() === entry.payload.value.shareCID.toString()).length === 0) {
                    await this.localSharedWithMeStore.add(entry.payload.value);
                    const value = entry.payload.value;
                    logger.info(`New share available, ${JSON.stringify(value)}`);
                    notify(value);
                }
            })();
        });
    }
    async create() {
        try {
            await super.create();
        }
        catch (err) {
            logger.debug(`Error creating IPFShareLog with address ${this._storeAddress}`);
        }
        logger.debug(`IPFShareLog created with address ${this.store.address.path}`);
        this.store.events.on("replicated", (address) => {
            logger.debug(`IPFShareLog replicated: ${address}`);
        });
        this.store.events.on("replicate.progress", (address, hash, entry, progress, have) => {
            logger.debug(`IPFShareLog replication progress: ${address} ${hash} ${entry} ${progress} ${have}`);
        });
        await this.ensureLocalUpToDate();
    }
    async close() {
        await super.close();
        logger.debug(`IPFShareLog closed with address ${this.store.address.root}`);
    }
    async onNewShare() {
        await this.store.load();
        logger.info(`ShareLog loaded ${this.store.address.toString()}`);
        this.store.events.on("replicated", (address) => {
            (async () => { await this.ensureLocalUpToDate(); })();
            logger.info(`ShareLog replicated event ${address}`);
        });
        this.store.events.on("replicate", (address) => {
            (async () => { await this.ensureLocalUpToDate(); })();
            logger.info(`ShareLog replicate event ${address} `);
        });
        this.store.events.on("peer", (peer) => {
            (async () => {
                await this.store.load();
            })();
            logger.info(`ShareLog peer connected ${peer}`);
        });
        this.store.events.on("replicate.progress", (address, hash, entry, progress, total) => {
            (async () => {
                logger.info("Writing new entry to ShareLog: ", entry);
                // Check if the entry's recipient field includes the current context's DID
                if (entry.payload.value.recipients.includes(this._orbitdb.id)
                    &&
                        entry.payload.value.senderId !== this._orbitdb.id) {
                    logger.info("Entry matches this node as recipient");
                    // Load the local mirror database
                    await this.localSharedWithMeStore.load();
                    // Check if the entry already exists in the local mirror database
                    const existingEntry = this.localSharedWithMeStore.iterator().collect().find((localEntry) => localEntry.hash === entry.hash);
                    if (existingEntry) {
                        logger.info("Entry already exists in mirror database: ", existingEntry);
                    }
                    else {
                        await this.localSharedWithMeStore.add(entry.payload.value);
                        const value = entry.payload.value;
                        logger.info(`New share available, ${value}`);
                        notify(value);
                    }
                }
            })();
        });
        this.store.events.on("peer.exchanged", (peer, address, heads) => {
            logger.info(`ShareLog peer ${peer} exchanged, ${heads.toString()}`);
        });
    }
}
//# sourceMappingURL=shareLog.js.map