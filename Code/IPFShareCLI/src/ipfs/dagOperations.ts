import { ctx } from "@app/index.js"
import archiver from "archiver"
import crypto from "crypto"
import fs, { createWriteStream } from "fs"
import { CID } from "kubo-rpc-client"
import path from "path"
import { pipeline } from "stream"
export class DagOperator{
        
    static async addEncryptedObject (cleartext: any, dids: string[])  {
        if (!ctx.did) throw new Error("DID not initialized")
        if (!ctx.ipfs) throw new Error("IPFS not initialized")
        if (!ctx.ipfs.api) throw new Error("IPFS API not initialized")
        const jwe = await ctx.did.createDagJWE(cleartext, dids)
        const jweStr = JSON.stringify(jwe, null, 2)
        const result = await ctx.ipfs.api.add(jweStr, { cidVersion: 1, hashAlg: "sha2-256", pin: true })
            .catch((err) => {
                console.error(err)
                throw err
            })
        if (!result) throw new Error("IPFS add failed")
        console.log(`Upload CID: ${result.cid}`)
    }
        
    static async getEnctrypedObject(cid: CID): Promise<Map<string, any>>{
        if (!ctx.did) throw new Error("DID not initialized")
        if (!ctx.ipfs) throw new Error("IPFS not initialized")
        if (!ctx.ipfs.api) throw new Error("IPFS API not initialized")
        const chunks = []
        for await (const chunk of ctx.ipfs.api.cat(cid)) {
            chunks.push(chunk)
        }
        const data = Buffer.concat(chunks)
        // const jwe = (await ctx.ipfs.api.dag.get(cid)).value
        const jwe = JSON.parse(data.toString())
        const shareable = await ctx.did?.decryptDagJWE(jwe)
        const shareableMap = new Map(Object.entries(shareable))
        return shareableMap
    }
   
}


export async function myTar(pathsToInclude: string[], tarPath="test.tar.gz") {
    // Generate a random key
    const key = crypto.randomBytes(32) // This generates a 256-bit key
    console.log("Encryption key:", key.toString("hex"))
    const iv = crypto.randomBytes(16)
    console.log("Encryption iv:", iv.toString("hex"))
    // Create a cipher using the random key
    const cipher = crypto.createCipheriv("aes-256-cbc", key,iv)

    // Create a gzip tarball stream
    const archive = archiver("tar", {
        gzip: true,
    })

    // Pipe the tarball stream into the cipher stream
    // Pipe the tarball stream into the cipher stream and then to a file
    pipeline(
        archive ,
        cipher,
        createWriteStream(tarPath),
        (err) => {
            if (err) {
                console.error("Pipeline failed:", err)
                process.exit(1) 
            } 
        }
    )

    // Add each path to the archive
    for (const p of pathsToInclude) {
        const stat = fs.statSync(p)
        if (stat.isDirectory()) {
            archive.directory(p, path.basename(p))
        } else if (stat.isFile()) {
            archive.file(p, { name: path.basename(p) })
        }
    }
    // Handle the encrypted data
    // cipher.on("data", (chunk) => {
    //     // Do something with the encrypted data...
    //     console.log("data event:")
    //     console.log(chunk)
    // })

    // Finalize the archive (ie. we are done appending files but streams have to finish yet)
    await archive.finalize()

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", function(err) {
        if (err.code === "ENOENT") {
            console.warn("File not found:", err)
            process.exit(1)
        } 
        throw err
    })

    // good practice to catch this error explicitly
    archive.on("error", function(err) {
        throw err
    })

    cipher.on("end", function () {
        console.log("Encryption finished")
    })
}


// export async function TarFolder(dirPath: string) {
//     const dir = await fsp.opendir(dirPath, { recursive: true, })
//         .catch((err) => { 
//             console.error(`${dirPath} is not a directory`)
//         })
//     if (!dir) return 
//     try {
//         await myTar(dirPath)
//     } catch (err) {
//         console.error("Error creating tarball:", err)
//     }
//     await dir.close()
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// const snap = await snapshot.toBinarySnapshot({fs: fs, path: dir.path})
// if (!ctx.did) throw new Error("DID not initialized")
// await DagOperator.addEncryptedObject(snap, [ctx.did.id])
// const promises: Promise<void>[] = []
// const vol = new Volume()
// for await(const dirEntry of dir) {
//     const relPath = path.relative(dirPath+ "/..", dirEntry.path)
//     if (dirEntry.isDirectory()) continue
//     promises.push(
//         fs.readFile(dirEntry.path).then(data => {
//             return new Promise((resolve, reject) => {
//                 const dir = "/" + path.dirname(relPath)
//                 if (!vol.existsSync(dir)) {
//                     vol.mkdirSync(dir, { recursive: true })
//                 }
//                 vol.writeFile("/" + relPath, data, (err) => {
//                     if (err) reject(err)
//                     else resolve()
//                 })
//             })
//         })
//     )   
// }
// await Promise.all(promises)
//     .catch(err => {
//         console.error(err)
//     })
// }