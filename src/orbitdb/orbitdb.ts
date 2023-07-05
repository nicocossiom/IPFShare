import { logger } from "@app/common/logger.js"
import { ctx } from "@app/index.js"
import { IPFShareRegistryAccessController } from "@app/registry.js"
import fs from "fs"
import path from "node:path"
import OrbitDB from "orbit-db"
import AccessControllers from "orbit-db-access-controllers"
import { getIdentity } from "./identity.js"

export async function getOrbitDB(daemon=false): Promise<OrbitDB> {
    // const ipfs = create({ url: `http://localhost:5002` })
    // see if the orbitdb folder exists
    const ipfshareHome = process.env.IPFSHARE_HOME
    if (ipfshareHome === undefined) throw new Error("IPFSHARE_HOME is not defined")
    const orbitdbPath = path.join(ipfshareHome, "orbitdb")
    if (!fs.existsSync(orbitdbPath)) {
        fs.mkdirSync(path.join(orbitdbPath, "identity"), {recursive: true})
        if (!fs.existsSync(orbitdbPath)) {
            throw new Error("Could not create orbitdb path")
        }
    }
    if (ctx.ipfs === undefined || ctx.ipfs == null) throw new Error("IPFS Node not initialized")
    logger.debug(`orbitdbPath: ${orbitdbPath}`)
    AccessControllers.addAccessController({ AccessController: IPFShareRegistryAccessController })
    logger.debug(`Custom registry access added: ${AccessControllers.isSupported("ipfshare-registry")}`)
    let orbitdbOptions 
    if (daemon) {
        if (!ctx.identity) {
            ctx.identity = await getIdentity(path.join(orbitdbPath, "identity"))
        }
        orbitdbOptions= {
            directory: orbitdbPath, 
            peerId: ctx.ipfs.peer.id.toString(),
            id: ctx.identity.id, 
            identity: ctx.identity,
            AccessControllers: AccessControllers
        }
    }
    else {
        const id = await getIdentity(path.join(orbitdbPath, "identity"))
        ctx.identity = id
        orbitdbOptions = {
            directory: orbitdbPath, 
            peerId: ctx.ipfs.peer.id.toString(),
            id: id.id, 
            identity: id,
            AccessControllers: AccessControllers
        }
    }
    
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore 
    const orbit = await OrbitDB.createInstance(ctx.ipfs.api, orbitdbOptions)
    logger.info(`OrbitDB instance created: ${orbit.id}`)
    return orbit
}

export async function determineAddress() { 
    const dbAddress = await ctx.orbitdb?.determineAddress("IPFShareGlobalRegistry", "keyvalue", {
        accessController: {
            write: ["*"]
        }
    })
    return dbAddress
}


