import { IPFS } from "kubo-rpc-client/dist/src/types";
import OrbitDB from "orbit-db";
import AccessController from "orbit-db-access-controllers/interface";
import DocumentStore from "orbit-db-docstore";
import { IdentityProvider } from "orbit-db-identity-provider";
export interface RegistryEntry {
    peerId: string;
    orbitdbIdentity: string;
    username: string;
}
export declare abstract class Registry<S, DocType> {
    abstract accessController: AccessController;
    abstract store: S;
    abstract open(): Promise<void>;
    abstract create(): Promise<void>;
    abstract replicate(): Promise<void>;
    abstract close(): Promise<void>;
    abstract addUser(user: DocType): Promise<void>;
    abstract getUser(entryId: string): Promise<DocType | undefined>;
    abstract updateUser(entryId: string, updates: Partial<DocType>): Promise<void>;
    abstract searchUsers(queryFn: (entry: DocType) => boolean): Promise<DocType[]>;
    abstract deleteUser(entryId: string): Promise<void>;
}
export declare class IPFShareRegistryAccessController extends AccessController {
    _orbitdb: OrbitDB;
    _registry: Registry<any, any>;
    constructor(orbitdb: OrbitDB, registry: Registry<any, any>);
    canAppend(entry: LogEntry<any>, identityProvider: IdentityProvider): Promise<boolean>;
    static get type(): string;
    save(): Promise<any>;
    get address(): string;
    static create(orbitdb: OrbitDB, options: {
        registry: Registry<any, any>;
    }): Promise<AccessController>;
}
export declare class UserRegistry implements Registry<DocumentStore<RegistryEntry>, RegistryEntry> {
    store: DocumentStore<RegistryEntry>;
    orbitdb: OrbitDB;
    ipfs: IPFS;
    accessController: IPFShareRegistryAccessController;
    constructor(ipfs: IPFS, orbitdb: OrbitDB);
    open(): Promise<void>;
    close(): Promise<void>;
    create(): Promise<void>;
    replicate(): Promise<void>;
    addUser(user: RegistryEntry): Promise<void>;
    getUser(entryId: string): Promise<RegistryEntry | undefined>;
    updateUser(entryId: string, updates: Partial<RegistryEntry>): Promise<void>;
    deleteUser(entryId: string): Promise<void>;
    searchUsers(mapper: (entry: RegistryEntry) => boolean): Promise<RegistryEntry[]>;
}
