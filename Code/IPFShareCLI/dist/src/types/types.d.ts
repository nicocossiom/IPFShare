import { IPFSNodeManager } from '../ipfs/IPFSNodeManager.js';
import { Controller } from 'ipfsd-ctl';
import OrbitDB from 'orbit-db';
export interface AppContext {
    manager: IPFSNodeManager | undefined;
    orbitdb: OrbitDB | undefined;
    ipfs: Controller<`js`> | undefined;
}
