import { logger } from "./common/logger.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AccessController from "orbit-db-access-controllers/interface";
export class Registry {
}
export class IPFShareRegistryAccessController extends AccessController {
    _orbitdb;
    _registry;
    constructor(orbitdb, registry) {
        super();
        this._orbitdb = orbitdb;
        this._registry = registry;
    }
    async canAppend(entry, identityProvider) {
        const userId = await entry.identity.id;
        if (!userId) {
            throw new Error("Username is not set");
        }
        logger.debug(`Registry: ${userId} is trying to append`);
        const existingUser = await this._registry.getUser(userId);
        // Only allow appending to the log if the user does not exist or the user is the owner
        if (!existingUser || existingUser.orbitdbIdentity === entry.identity.id) {
            logger.debug(`Registry: ${userId} authorized to append`);
            // Allow access if identity verifies
            return true;
        }
        logger.debug(`Registry: ${userId} NOT authorized to append`);
        return false;
    }
    static get type() {
        return "ipfshare-registry";
    }
    save() {
        return Promise.resolve({});
    }
    get address() {
        return this._registry.store.address.toString();
    }
    static async create(orbitdb, options) {
        // options must contain the registry to be used for access control
        return new IPFShareRegistryAccessController(orbitdb, options.registry);
    }
}
export class UserRegistry {
    store;
    orbitdb;
    ipfs;
    accessController;
    constructor(ipfs, orbitdb) {
        this.ipfs = ipfs;
        this.orbitdb = orbitdb;
        this.store = {};
        this.accessController = new IPFShareRegistryAccessController(orbitdb, this);
    }
    async open() {
        // if (this.store != {} as KeyValueStore<IUser>) return
        try {
            this.store = await this.orbitdb.docstore("ipfshare-registry", {
                accessController: {
                    type: IPFShareRegistryAccessController.type,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    registry: this,
                },
                indexBy: "orbitdbIdentity", // specify the field to be used as the index
            });
            await this.store.load();
        }
        catch (e) {
            await this.create();
        }
    }
    async close() {
        await this.store.close();
    }
    async create() {
        try {
            this.store = await this.orbitdb.docstore("ipfshare-registry", {
                accessController: {
                    type: IPFShareRegistryAccessController.type,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    registry: this,
                },
                create: true,
                indexBy: "orbitdbIdentity", // Specify the field to be used as the index
            });
        }
        catch (e) {
            logger.error(e);
        }
    }
    async replicate() {
        await this.store.load();
        this.store.events.on("replicated", (address) => {
            logger.info(`Registry replicated ${address} `);
            logger.info(`Registry replication status: \n\tprogress:${this.store.replicationStatus.progress}\n\tqueued${this.store.replicationStatus.queued}`);
        });
        this.store.events.on("replicate", (address) => {
            logger.info(`Registry replicate ${address} `);
            logger.info(`Registry replication status: \n\tprogress:${this.store.replicationStatus.progress}\n\tqueued${this.store.replicationStatus.queued}`);
        });
        this.store.events.on("peer", (peer) => {
            (async () => {
                await this.store.load();
            })();
            logger.info(`Registry peer connected ${peer}`);
        });
        this.store.events.on("replicate.progress", (address, hash, entry, progress, have) => {
            logger.info(`Registry replication progress ${address}, ${hash}, ${entry}, ${progress}, ${have}`);
        });
        this.store.events.on("peer.exchanged", (peer, address, heads) => {
            logger.info(`Registry\n\tpeer ${peer} exchanged, ${heads.toString()}`);
        });
    }
    async addUser(user) {
        if (!user.username)
            throw new Error("Username is not set");
        await this.store.put(user);
    }
    async getUser(entryId) {
        const matchingUsers = this.store.get(entryId);
        if (matchingUsers.length === 0)
            return undefined;
        if (matchingUsers.length > 1)
            throw new Error("Multiple users with the same username");
        return matchingUsers[0];
    }
    async updateUser(entryId, updates) {
        const oldEntry = await this.getUser(entryId);
        if (!oldEntry)
            throw new Error("User not found");
        const newEntry = {
            ...oldEntry,
            ...updates
        };
        this.store.put(newEntry);
    }
    async deleteUser(entryId) {
        const user = await this.getUser(entryId);
        if (!user) {
            throw new Error("User not found");
        }
        await this.store.del(entryId);
    }
    async searchUsers(mapper) {
        const allUsers = this.store.query(mapper);
        return allUsers;
    }
}
//# sourceMappingURL=registry.js.map