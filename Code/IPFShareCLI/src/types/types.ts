import { IPFSNodeManager } from '@ipfs/IPFSNodeManager.js'
import { DID } from 'dids'
import { Controller, ControllerType } from 'ipfsd-ctl'
import OrbitDB from 'orbit-db'
import { Identity } from 'orbit-db-identity-provider'
// eslint-disable-next-line quotes

export interface AppContext {
    manager: IPFSNodeManager | undefined,
    orbitdb: OrbitDB | undefined,
    dbAddress: string | undefined,
    identity: Identity | undefined,
    did: DID | undefined,
    ipfs: Controller<ControllerType> | undefined,
}