import { AppConfig } from "@app/common/appConfig"
import { UserRegistry } from "@app/registry"
import { IPFSNodeManager } from "@ipfs/IPFSNodeManager.js"
import { DID } from "dids"
import type { Controller, ControllerType } from "ipfsd-ctl"
import { Socket } from "net"
import OrbitDB from "orbit-db"
import { Identity } from "orbit-db-identity-provider"

export interface AppContext {
    manager: IPFSNodeManager | undefined,
    orbitdb: OrbitDB | undefined,
    dbAddress: string | undefined,
    identity: Identity | undefined,
    did: DID | undefined,
    ipfs: Controller<ControllerType> | undefined,
    daemonSocket: Socket | undefined,
    registry: UserRegistry | undefined, 
    appConfig: AppConfig | undefined


}