import { IPFSNodeManager } from '@ipfs/IPFSNodeManager.js'
import OrbitDB from 'orbit-db'
// eslint-disable-next-line quotes

export interface AppContext { manager: IPFSNodeManager| undefined, orbitdb: OrbitDB|undefined}