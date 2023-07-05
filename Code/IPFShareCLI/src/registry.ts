import { logger } from "@common/logger.js"
import { IPFS } from "kubo-rpc-client/dist/src/types"

import OrbitDB from "orbit-db"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AccessController from "orbit-db-access-controllers/interface"
import DocumentStore from "orbit-db-docstore"
import { IdentityProvider } from "orbit-db-identity-provider"

export interface RegistryEntry {
  peerId: string
  orbitdbIdentity: string // DID
  username: string // alias
}

export abstract class Registry<S, DocType> {
    abstract accessController: AccessController
    abstract store: S
    abstract open(): Promise<void> 
    abstract create(): Promise<void>
    abstract replicate(): Promise<void>
    abstract close(): Promise<void>
    abstract addUser(user: DocType): Promise<void>
    abstract getUser(entryId: string): Promise<DocType | undefined>
    abstract updateUser(entryId: string, updates: Partial<DocType>): Promise<void>
    abstract searchUsers(queryFn: (entry: DocType) => boolean): Promise<DocType[]>
    abstract deleteUser(entryId: string): Promise<void>
}

export class IPFShareRegistryAccessController extends AccessController{
    
    _orbitdb: OrbitDB
    _registry: Registry<any, any>

    constructor(orbitdb: OrbitDB, registry: Registry<any, any>) {
        super()
        this._orbitdb = orbitdb
        this._registry = registry
    }

    async canAppend(entry: LogEntry<any>, identityProvider: IdentityProvider): Promise<boolean> {
        const userId = await entry.identity.id
        if (!userId) {
            throw new Error("Username is not set")
        }
        logger.debug(`User ID: ${userId}`)
        const existingUser = await this._registry.getUser(userId)

        // Only allow appending to the log if the user does not exist or the user is the owner
        if (!existingUser || existingUser.orbitdbIdentity === entry.identity.id) {
            // Allow access if identity verifies
            return true
        }
        return false
    }

    static get type(): string {
        return "ipfshare-registry"
    }

    save(): Promise<any> {
        return Promise.resolve({})
    }

    get address(): string {
        return this._registry.store.address.toString()
    }

    static async create(orbitdb: OrbitDB, options:{registry: Registry<any, any>}): Promise<AccessController> {
        // options must contain the registry to be used for access control
        return new IPFShareRegistryAccessController(orbitdb, options.registry)
    }
}

export class UserRegistry implements Registry<DocumentStore<RegistryEntry>, RegistryEntry> {
    store: DocumentStore<RegistryEntry>
    orbitdb: OrbitDB
    ipfs: IPFS
    accessController: IPFShareRegistryAccessController
    
    constructor(ipfs: IPFS, orbitdb: OrbitDB) {
        this.ipfs = ipfs
        this.orbitdb = orbitdb
        this.store = {} as DocumentStore<RegistryEntry>
        this.accessController = new IPFShareRegistryAccessController(orbitdb, this)
    }
    
    async open(): Promise<void> {
        // if (this.store != {} as KeyValueStore<IUser>) return
        try {
            this.store = await this.orbitdb.docstore<RegistryEntry>(
                "ipfshare-registry",
                {
                    accessController: {
                        type: IPFShareRegistryAccessController.type,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        registry: this,
                    },
                    indexBy: "orbitdbIdentity", // specify the field to be used as the index
                }
            )
            await this.store.load()
        } catch (e) {
            await this.create()
        }
    }

    async close(): Promise<void>{
        await this.store.close()
    }

    async create(): Promise<void> {
        try {
            
            this.store = await this.orbitdb.docstore("ipfshare-registry",
                {
                    accessController: {
                        type: IPFShareRegistryAccessController.type,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        registry: this,
                    },
                    create: true,
                    indexBy: "orbitdbIdentity", // Specify the field to be used as the index

                })
        }catch (e) {
            logger.error(e)
        }
    }

    async replicate(): Promise<void> {
        await this.store.load()
        logger.info(`Registry loaded ${this.store.address.toString()}`)
        this.store.events.on("replicated", (address) => {
            logger.info(`Registry replicated ${address} `)
            logger.info(`PeersDB replication status: \n\tprogress:${this.store.replicationStatus.progress}\n\tqueued${this.store.replicationStatus.queued}`)
        })
        this.store.events.on("replicate", (address) => {
            logger.info(`Registry replicate ${address} `)
            logger.info(`PeersDB replication status: \n\tprogress:${this.store.replicationStatus.progress}\n\tqueued${this.store.replicationStatus.queued}`)
        })
        this.store.events.on("peer", (peer) => {
            (async () => {
                await this.store.load()
            })()
            logger.info(`Registry peer connected ${peer}`)
        })
        this.store.events.on("replicate.progress", (address, hash, entry, progress, have) => {
            logger.info(`Registry replication progress ${address}, ${hash}, ${entry}, ${progress}, ${have}`)
        })
        this.store.events.on("peer.exchanged", (peer, address, heads) => {
            logger.info(`Registry\n\tpeer ${peer} exchanged, ${heads.toString()}`)
        } )

    }

    async addUser(user: RegistryEntry): Promise<void> {
        if (!user.username) throw new Error("Username is not set")
        await this.store.put(user)
    }

    async getUser(entryId: string): Promise<RegistryEntry | undefined> {
        const matchingUsers = this.store.get(entryId)
        if (matchingUsers.length === 0) return undefined
        if (matchingUsers.length > 1) throw new Error("Multiple users with the same username")
        return matchingUsers[0]
    }

    async updateUser(entryId: string, updates: Partial<RegistryEntry>): Promise<void> {
        const oldEntry = await this.getUser(entryId)
        if (!oldEntry) throw new Error("User not found")
        const newEntry = {
            ...oldEntry,
            ...updates
        } as RegistryEntry
        this.store.put(newEntry)

    }

    async deleteUser(entryId: string): Promise<void> {
        const user = await this.getUser(entryId)
        if (!user) {
            throw new Error("User not found")
        }
        await this.store.del(entryId)
       
    }

    async searchUsers(mapper: (entry: RegistryEntry) => boolean): Promise<RegistryEntry[]> {
        const allUsers = this.store.query(mapper)
        return allUsers
    }
}