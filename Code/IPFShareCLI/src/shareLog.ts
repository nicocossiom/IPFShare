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
        this.store.events.on("replicate.progress", (address, hash, entry, progress, have) => {
            logger.info(`ShareLog replication progress \naddress: ${address.toString()} \nhash: ${hash.toString()}\nentry: ${entry.toString()}\nprogress: ${progress.toString()}\nhave: ${have.toString()}`)
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