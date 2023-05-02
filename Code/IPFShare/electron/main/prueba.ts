import crypto from "node:crypto"
import { stdin as input, stdout as output } from "node:process"
import * as readline from "node:readline"
import { IPFSNodeManager } from "../ipfs_utils/IPFSNodeManager"
import { CeramicClient, orbitdb } from "./exporter"
const rl = readline.createInterface({ input, output })



async function pruebaIPFSOrbit() {
    const manager = await new IPFSNodeManager() 
    let node1 = await manager.createNode()
    node1 = await node1.init()
    console.log(`Node 1 ${await node1.start()}`)
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
    console.log(retrieved)
}

async function pruebaCeramic() {
    const manager = await new IPFSNodeManager()
    let node1 = await manager.createNode()
    node1 = await node1.init()
    console.log(`Node 1 ${(await node1.start())}`)
    console.log(node1)
    const ThreeIdResolver = await import("@ceramicnetwork/3id-did-resolver")
    const KeyDidResolver = await import("key-did-resolver")
    const ceramic = new CeramicClient.CeramicClient("http://0.0.0.0:7007")
    // const { DID } = await import("dids")
    const { ThreeIdProvider } = await import("@3id/did-provider")
    const {DID} = await import("dids")
    type ThreeIdProviderConfig = Parameters<typeof ThreeIdProvider.create>[0]
    const resolver = {
        ...KeyDidResolver.getResolver(),
        ...ThreeIdResolver.getResolver(ceramic),
    }
    const seed = crypto.randomBytes(32)
    //create a 32byte long secret
    const threeIdConfig: ThreeIdProviderConfig = {
        ceramic: ceramic,
        // authId: "",
        // authSecret: authSecret,
        seed: seed,
        getPermission: (request) => Promise.resolve(request.payload.paths),
    }
    
    const threeID = await ThreeIdProvider.create(threeIdConfig)

    const did = new DID({ provider: threeID.getDidProvider(), resolver: resolver })
    await did.authenticate()

    ceramic.did = did
    console.log("Ceramic client created")
    // console.log(ceramic)
    // sign the payload as dag-jose
    console.log("Creating JWS")
    const ipfs = node1.api
    
    async function addEncryptedObject(cleartext: any, dids: string[]) {
        const jwe = await did.createDagJWE(cleartext, dids)
        return ipfs.dag.put(jwe, { storeCodec: "dag-jose", hashAlg: "sha2-256" })
    }
    async function getEnctrypedObject(cid: any) {
        const jwe = (await ipfs.dag.get(cid)).value
        const cleartext = await did.decryptDagJWE(jwe)
        return cleartext

    }
    // get a file from downloads
    // const file = fs.readFileSync("/Users/pepperonico/Downloads/prueba.pdf")
    const payload = { data: "Hola mi gente" }
    console.log("Payload: ", "" + payload)
    const fileCid = await addEncryptedObject(payload, ["  "])
    console.log("File CID: ", fileCid.toJSON())
    const fileFromIPFS = await getEnctrypedObject(fileCid) as Buffer
    console.log("File from IPFS: ", "" + payload.data)
    // write the file to ./prueba.pdf
    // fs.writeFileSync("./prueba.pdf", fileFromIPFS)

}

async function run2nodes() {
    const manager = new IPFSNodeManager()
    const nodeipfs1 = await manager.createNode()
    console.log(nodeipfs1.path)
    const ipfs1 = nodeipfs1.api
    // const nodeipfs2 = await manager.createNode()
    // console.log("Node 2 started")

    // await nodeipfs2.init()
    // await nodeipfs2.start()
    // const ipfs2 = nodeipfs1.api
    // // const ipfs2: IPFS | { libp2p: Libp2p } = await manager.createIPFSNode()
    // await ipfs1.swarm.peers().then((peers) => console.log("Node 1 peers: ", peers.length))
    // console.log("Node 2 started")
    // setInterval(async () => {
    //     const message = `Hello from ${(await ipfs1.id()).id}, it's ${new Date().toLocaleTimeString()}`
    //     await ipfs1.pubsub.publish("test", Buffer.from(message))
    //     console.log(`Published "${message}"`)
    // }, 4000)
    // ipfs2.pubsub.subscribe("test", (message) => {
    //     console.log(`Received: ${message.data.toString()}`)
    // })
    // const room = new Room(ipfs1, "/ipfshare/v0/test")
    
    // const orbitdb1 = await orbitdb.default
    //     .createInstance(ipfs1,
    //         {
    //             directory: (await ipfs1.repo.stat()).repoPath + "/orbitdb",
    //         }
    //     )
    // const orbitdb2 = await orbitdb.default
    //     .createInstance(ipfs2,
    //         {
    //             directory: (await ipfs2.repo.stat()).repoPath + "/orbitdb",
    //         }
    //     )
    
    

   
}


// try {
//     const rest = await node1.api.name.publish(hash)
//     console.log("Published to IPNS: ", rest.name)
// } catch (err) {
//     console.log("Error publishing to IPNS: ", err)
// }
// console.log(retrieved.payload.value)
// try {

export async function startPrueba() {
    // await pruebaIPFSOrbit().catch((err) => console.log("Error in prubea ipfs: ", err))
    // await pruebaCeramic().catch((err) => console.log("Error in prueba ceramic: ", err))
    await run2nodes().catch((err) => console.log("Error in run2nodes: ", err))
}