import { logger } from "@common/logger.js"
import { CID } from "kubo-rpc-client/"
import { IPFS } from "kubo-rpc-client/dist/src/types"
import OrbitDB from "orbit-db"
import EventStore from "orbit-db-eventstore"


export interface ShareLogEntry{
    recipients: string[]
    message: string
    shareCID: CID
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
        this.localStore = await this._orbitdb.eventlog<T>(this._storeAddress, { accessController: { write: ["*"] }, create: false, localOnly: true})
        await this.store.load()
        await this.localStore.load()
        this.onNewShare()
    }
    async create(): Promise<void> {
        this.store = await this._orbitdb.eventlog<T>(this._storeAddress, { accessController: { write: ["*"] }, create: true })
        this.localStore = await this._orbitdb.eventlog<T>(this._storeAddress, { accessController: { write: ["*"] }, create: true, localOnly: true})
        await this.store.load()
        await this.localStore.load()
        this.onNewShare()
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

    onNewShare(): void { 
        this.store.events.on("replicated", (address) => {
            logger.debug(`ShareLog replicated: ${address}`)
        })
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