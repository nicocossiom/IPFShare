import { logger } from "@common/logger.js"
import { CID } from "kubo-rpc-client/"
import { IPFS } from "kubo-rpc-client/dist/src/types"
import notifier from "node-notifier"
import OrbitDB from "orbit-db"
import EventStore from "orbit-db-eventstore"
import clipboardy from "clipboardy"
export interface ShareLogEntry{
    recipients: string[]
    message: string
    shareCID: CID
    recipientNames: string[]
    senderName: string
}

function notify(value: ShareLogEntry) {
    notifier.notify({
        title: `IPFShare: ${value.senderName} shared something with you`,
        message: "A new IPFShare is available: click to copy the link to your clipboard",
        open: value.shareCID.toString(),
        sound: true,
        wait: false,
    })
    notifier.on("click", async (notifierObject, options) => {
        await clipboardy.write(value.shareCID.toString())
    })
}

export class ShareLog<T> {
    _storeAddress: string
    _orbitdb: OrbitDB
    _ipfs: IPFS
    store: EventStore<T>
    localStore: EventStore<T>
    constructor(ipfs: IPFS, orbitdb: OrbitDB, storeAddress: string) {
        this._ipfs = ipfs
        this._orbitdb = orbitdb
        this._storeAddress = storeAddress
        this.store = {} as EventStore<T>
        this.localStore = {} as EventStore<T>
    }
    async open(): Promise<void>{
        this.store = await this._orbitdb.eventlog<T>(this._storeAddress, { accessController: { write: ["*"] }, create: false })
        this.localStore = await this._orbitdb.eventlog<T>(`${this._storeAddress}${this._orbitdb.id}`, { accessController: { write: ["*"] }, create: false, localOnly: true})
        await this.store.load()
        await this.localStore.load()
    }
    async create(): Promise<void> {
        this.store = await this._orbitdb.eventlog<T>(this._storeAddress, { accessController: { write: ["*"] }, create: true })
        this.localStore = await this._orbitdb.eventlog<T>(`${this._storeAddress}${this._orbitdb.id}`, { accessController: { write: ["*"] }, create: true, localOnly: true})
        await this.store.load()
        await this.localStore.load()
    }
    async close(): Promise<void>{
        await this.store?.close()
    }
    async addShare(share: T): Promise<string>{
        return await this.store.add(share)
    }
    getShare(shareLogEntryHash: string): LogEntry<T> | undefined{
        const entry = this.store.get(shareLogEntryHash)
        return entry
    }

    async onNewShare(): Promise<void> { 
        await this.store.load()
        logger.info(`ShareLog loaded ${this.store.address.toString()}`)
        this.store.events.on("replicated", (address) => {
            logger.info(`ShareLog replicated event ${address} `)
        })
        this.store.events.on("replicate", (address) => {
            logger.info(`ShareLog replicate event ${address} `)
        })
        this.store.events.on("peer", (peer) => {
            (async () => {
                await this.store.load()
            })()
            logger.info(`ShareLog peer connected ${peer}`)
        })

        this.store.events.on("write", async (address, entry, heads) => {
            logger.info("Writing new entry to ShareLog: ", entry)

            // Check if the entry's recipient field includes the current context's DID
            if (entry.payload.value.recipients.includes(this._orbitdb.id)) {
                logger.info("Entry matches this node as recipient")

                // Load the local mirror database
                await this.localStore.load()

                // Check if the entry already exists in the local mirror database
                const existingEntry = this.localStore.iterator().collect().find((localEntry) => localEntry.hash === entry.hash)

                if (existingEntry) {
                    logger.info("Entry already exists in mirror database: ", existingEntry)
                } else {
                    await this.localStore.add(entry.payload.value)
                    const value: ShareLogEntry = entry.payload.value
                    logger.info(`New share available, ${value}`)
                    notify(value)
                }
            }
        })

        this.store.events.on("peer.exchanged", (peer, address, heads) => {
            logger.info(`ShareLog peer ${peer} exchanged, ${heads.toString()}`)
        } )
    }
}

export class IPFShareLog extends ShareLog<ShareLogEntry>{
    async open() {
        try {
            await super.open()
        } catch (err) {
            return await this.create()
        }
    }
    async create() { 
        try {
            await super.create()
        } catch (err) {
            logger.debug(`Error creating IPFShareLog with address ${this._storeAddress}`)
        }
        logger.debug(`IPFShareLog created with address ${this.store.address.path}`)
        this.store.events.on("replicated", (address) => {
            logger.debug(`IPFShareLog replicated: ${address}`)
        })
        this.store.events.on("replicate.progress", (address, hash, entry, progress, have) => { 
            logger.debug(`IPFShareLog replication progress: ${address} ${hash} ${entry} ${progress} ${have}`)
        })
    }
    async close(): Promise<void> {
        await super.close()
        logger.debug(`IPFShareLog closed with address ${this.store.address.root}`)
    }
}