import { ctx } from "@app/index.js"
import archiver from "archiver"
import { Presets, SingleBar } from "cli-progress"
import crypto, { createDecipheriv } from "crypto"
import { CID } from "kubo-rpc-client"
import { AddResult } from "kubo-rpc-client/dist/src/types"
import fsp from "node:fs/promises"
import path from "path"
import { PassThrough, Readable } from "stream"
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
   
export async function downloadFromIpfs(cid: CID): Promise<NodeJS.ReadableStream> {
    if (!ctx.ipfs) throw new Error("IPFS not initialized")
    const asyncIterable = ctx.ipfs.api.cat(cid)
    const stream = Readable.from(asyncIterable)
    return stream
}

export async function uploadToIpfs(stream: PassThrough): Promise<AddResult> {
    if (!ctx.ipfs) throw new Error("IPFS not initialized")
    const addRes = await ctx.ipfs.api.add(stream, {pin: true})
    return addRes
}

export async function createEncryptedTarFromPaths(pathsToInclude: string[], tarPath="test.tar.gz") {
    const progressBarArchive = new SingleBar(
        {
            format: "Archive creation [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}",
        },
        Presets.shades_classic
    )

    const progressBarEncryption = new SingleBar(
        {
            format: "Encryption [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}",
        },
        Presets.shades_classic
    )
    // Generate a random key
    const key = crypto.randomBytes(32) // This generates a 256-bit key
    // console.log("Encryption key:", key.toString("hex"))
    const iv = crypto.randomBytes(16)
    // console.log("Encryption iv:", iv.toString("hex"))
    // Create a cipher using the random key
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv) 
   
    // Create a pass-through stream which will be given to ifps.add
    const pass = new PassThrough()

    // tar archive stream with gzip compression 
    const archive = archiver("tar",
        {
            gzip: true, 
            zlib: { chunkSize: 10 * 1024 * 1024, level: 1}, // Chunk size of 10MB
            gzipOptions: { chunkSize: 10 * 1024 * 1024, level: 1 }, // Chunk size of 10MB, 
            statConcurrency: 50, 
        }
    )
    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", function(err) {
        if (err.code === "ENOENT") {
            console.warn("File not found:", err)
            process.exit(1)
        } 
        throw err
    })
    
    archive.on("entry", function (entry) {
        progressBarArchive.increment()
        progressBarArchive.updateETA()
    })
    archive.on("progress", function (progress) {
        console.log(`Progress ${progress.entries.processed} / ${progress.entries.total}`)
    })

    // good practice to catch this error explicitly
    archive.on("error", function(err) {
        throw err
    })
   
    archive.on("end", function () {
        console.log("Tar file created")
        progressBarArchive.stop()
        console.log("Archive finished: ")
        console.timeEnd("Archive")
        console.log("\n")
        console.time("Encryption")
        progressBarEncryption.start(progressBarArchive.getTotal(), 0)
    })

    let entries = 0
    console.time("Archive")
    const statPromises = pathsToInclude.map(async (p) => {
        const stat = await fsp.stat(p)
        if (stat.isDirectory()) {
            const files = await fsp.readdir(p)
            entries += files.length
            archive.directory(p, path.basename(p))
        } else if (stat.isFile()) {
            entries += 1
            archive.file(p, { name: path.basename(p) })
            
        }
    })

    progressBarArchive.start(entries, 0)
    await Promise.all(statPromises)

    cipher.on("data", (chunk) => {
        progressBarEncryption.increment(chunk.length)
    })
    cipher.on("end", function () {
        progressBarEncryption.stop()
        console.log("Encryption finished")
        console.timeEnd("Encryption")
        console.log("\n")
    })
    // Pipe the archive to the cipher and then to the pass-through stream
    archive.pipe(cipher).pipe(pass)
    
    // Finalize the archive (ie. we are done appending files but streams have to finish yet)
    archive.finalize()
    return { encryptedStream: pass, iv: iv, key: key }
}



export function decryptAndExtractTarball(encryptedStream: NodeJS.ReadableStream, key: Buffer, iv: Buffer, outputPath: string, totalSize: number){
    return new Promise<void>((resolve, reject) => {
        // Create a decipher using the provided key and iv
        const decipher = createDecipheriv("aes-256-cbc", key, iv)
        const untar = tar.extract({ cwd: outputPath })
        // Create a progress bar for the decryption and extraction process
        const progressBar = new SingleBar({format: "progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}"}, Presets.shades_classic)
        const totalSizeMb = Math.round(totalSize / 1_048_57)
        progressBar.start(totalSizeMb, 0)

        decipher.on("data", (chunk) => {
            progressBar.increment(Math.round(chunk.length / 1_048_57))
            progressBar.updateETA()
        })
        decipher.on("finish", () => {
            console.log("Extraction finished")
            progressBar.stop()
            resolve()
        })
        decipher.on("error", (error) => {
            progressBar.stop()
            reject(error)
        })
        encryptedStream
            .pipe(decipher)
            .pipe(untar)
            
    })
    
}

export async function decryptTarballAndReadEntries(encryptedStream: NodeJS.ReadableStream, key: Buffer, iv: Buffer): Promise<string[]> {
    // Create a decipher using the provided key and iv
    const decipher = createDecipheriv("aes-256-cbc", key, iv)

    // Decrypt the stream
    const decryptedStream = encryptedStream.pipe(decipher)

    decryptedStream.on("finish", () => {
        console.log("Decryption finished")
    })

    // Create a new tar Parse stream
    const parse = new tar.Parse()

    // Pipe the decrypted stream into the Parse stream
    decryptedStream.pipe(parse)

    // Collect all the entries
    const entries: string[] = []
    parse.on("entry", (entry) => {
        console.log("Entry:", entry.path)
        entries.push(entry.path)
    })


    // Wait for the 'end' event to ensure all entries have been processed
    new Promise<void>(
        (resolve) => {
            parse.on("end", () => {
                console.log("Parse finished")
                resolve()
            })
        }
        
    )

    return entries
}

