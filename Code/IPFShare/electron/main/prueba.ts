import  from "ipfs"
import OrbitDB from "orbit-db"


interface ContextApp {
    ipfs: IPFS 
    orbitdb: OrbitDB 
}

const ctx: ContextApp = {} as ContextApp

async function loadContext() {
    console.log("Loading context")
    console.log(" 📦 Importing IPFS module ... ")
    const IPFS = await import("ipfs")
    console.log("✅ Success")
    console.log("🌐 Starting IPFS node ...")
    const ipfs = await IPFS.create()
    console.log("✅ Success")
    console.log(" 📦 Importing  OrbitDB module ... ")
    const orbitdbModule = await import("orbit-db")
    console.log("✅ Success")
    console.log("🪐 Starting OrbitDB node ..."  )
    const orbitdb = await orbitdbModule.default.createInstance(ipfs)
    console.log("✅ Success")
    ctx.ipfs = ipfs
    ctx.orbitdb = orbitdb
    console.log("Context loaded")
    console.log(ctx)
}


async function main() {
    const dirDb = await ctx.orbitdb.docstore("fs", {indexBy: "path"})
    await dirDb.load()
    dirDb.put({path: "test", cid: "QmTest"})
    console.log(dirDb.get("test"))
}
// async function addDirectory(ipfs : IPFS, dirPath: string, dirDb: DocumentStore<) {
//     // Add the directory and its contents to IPFS
//     const files = await ipfs.addAll(fs.createReadStream(dirPath), { recursive: true })

//     // Store the CIDs and paths in OrbitDB
//     for (const file of files) {
//         const entry = { path: file.path, cid: file.cid.toString() }
//         await dirDb.put(entry)
//     }
// }

export async function startOrbitdb() {
    await loadContext().catch((err) => console.log("Error loading context: ", err))
    await main().then(() => console.log("Main finished"))
}