import { IPFSNodeManager } from '../ipfs/IPFSNodeManager.js';
import OrbitDB from 'orbit-db';
export interface AppContext {
    manager: IPFSNodeManager | undefined;
    orbitdb: OrbitDB | undefined;
}
