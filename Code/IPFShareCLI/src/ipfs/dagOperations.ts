import { ctx } from "@app/index.js"
import archiver from "archiver"
import crypto, { createDecipheriv } from "crypto"
import fs, { createWriteStream } from "fs"
import { CID } from "kubo-rpc-client"
import { AddResult } from "kubo-rpc-client/dist/src/types"
import path from "path"
import { PassThrough, Readable, pipeline } from "stream"
import tar from "tar"


export type Share = {
    contentCID: CID,
    key: Buffer,
    iv: Buffer,
    recipientDIDs: string[],
}

export async function addEncryptedObject (share: Share): Promise<CID> {
    if (!ctx.did) throw new Error("DID not initialized")
    if (!ctx.ipfs) throw new Error("IPFS not initialized")
    if (!ctx.ipfs.api) throw new Error("IPFS API not initialized")
    const jwe = await ctx.did.createDagJWE(share, share.recipientDIDs)
    const result = await ctx.ipfs.api.dag.put(jwe, {storeCodec: "dag-jose", hashAlg: "sha2-256", pin: true })
        .catch((err) => {
            console.error(err)
            throw err
        })
    if (!result) throw new Error("IPFS add failed")
    return result
}
        
export async function getEnctrypedObject(cid: CID){
    if (!ctx.did) throw new Error("DID not initialized")
    if (!ctx.ipfs) throw new Error("IPFS not initialized")
    if (!ctx.ipfs.api) throw new Error("IPFS API not initialized")
    const shareResult = await ctx.ipfs.api.dag.get(cid) 
    const share = await ctx.did.decryptDagJWE(shareResult.value) as Share
    return share
}
   


export async function createEncryptedTarFromPaths(pathsToInclude: string[], tarPath="test.tar.gz") {
    // Generate a random key
    const key = crypto.randomBytes(32) // This generates a 256-bit key
    // console.log("Encryption key:", key.toString("hex"))
    const iv = crypto.randomBytes(16)
    // console.log("Encryption iv:", iv.toString("hex"))
    // Create a cipher using the random key
    const cipher = crypto.createCipheriv("aes-256-cbc", key,iv)
    
    // Create a pass-through stream which will be given to ifps.add
    const pass = new PassThrough()

    // Create a gzip tarball stream
    const archive = archiver("tar", {
        gzip: true,
    })
    const pipeErrorFn = (err : NodeJS.ErrnoException | null ) => {
        if (err) {
            console.error("Pipeline failed:", err)
            process.exit(1) 
        } 
    } 
    if (tarPath) {
        pipeline(
            archive ,
            cipher,
            pass,
            createWriteStream(tarPath),
            pipeErrorFn 
        )
    }
    else {
        pipeline(
            archive ,
            cipher,
            pass,
            pipeErrorFn
        ) 
    }
   

    // Add each path to the archive
    for (const p of pathsToInclude) {
        const stat = fs.statSync(p)
        if (stat.isDirectory()) {
            archive.directory(p, path.basename(p))
        } else if (stat.isFile()) {
            archive.file(p, { name: path.basename(p) })
        }
    }
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

    return { encryptedStream: pass, iv: iv, key: key }
}

export async function downloadFromIpfs(cid: CID): Promise<NodeJS.ReadableStream> {
    if (!ctx.ipfs) throw new Error("IPFS not initialized")
    const asyncIterable = ctx.ipfs.api.cat(cid)
    const stream = Readable.from(asyncIterable)
    return stream
}

export async function uploadToIpfs(stream: PassThrough): Promise<AddResult> {
    if (!ctx.ipfs) throw new Error("IPFS not initialized")
    const addRes = await ctx.ipfs.api.add(stream)
    return addRes
}

export async function decryptAndExtractTarball(encryptedStream: NodeJS.ReadableStream, key: Buffer, iv: Buffer, outputPath: string): Promise<void> {
    // Create a decipher using the provided key and iv
    const decipher = createDecipheriv("aes-256-cbc", key, iv)

    // Decrypt the stream and extract the tarball
    encryptedStream
        .pipe(decipher)
        .pipe(tar.extract({ cwd: outputPath }))
}