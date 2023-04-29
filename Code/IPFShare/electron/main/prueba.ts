import { IPFSNodeManager } from "../ipfs_utils/ipfs_utils"
import { orbitdb } from "./exporter"

/**
 * Loads and initializes IPFS and OrbitDB modules, creates instances and stores them in the context
 */
async function loadContext() {

    const manager = await new IPFSNodeManager() 
    let node1 = await manager.createNode()
    node1 = await node1.init()
    console.log(`Node 1 ${await node1.start()}\n`)
    console.log(node1)
    console.log(" 📦 Importing OrbitDB module ... ")
    const orbit = await orbitdb.default.createInstance(node1.api)
    console.log("OrbitDB instance created")
    const db = await orbit.log("test")
    console.log("OrbitDB log created")
    await db.load()
    console.log("OrbitDB log loaded")
    const hash = await db.add("Hello world")
    const retrieved = db.get(hash)
    console.log(retrieved.payload.value)
}



export async function startPrueba() {
    await loadContext().catch((err) => console.log("Error loading context: ", err))
}