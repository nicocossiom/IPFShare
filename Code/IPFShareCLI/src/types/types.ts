import { DagOperator } from '@app/ipfs/dagOperations.js'
import { IPFSNodeManager } from '@ipfs/IPFSNodeManager.js'
import { Controller } from 'ipfsd-ctl'
import OrbitDB from 'orbit-db'
// eslint-disable-next-line quotes

export interface AppContext {
    manager: IPFSNodeManager | undefined,
    orbitdb: OrbitDB | undefined,
    ipfs: Controller<`js`> | undefined,
    dagOperator: DagOperator | undefined
}