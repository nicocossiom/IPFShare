import { logger } from '@app/common/logger.js'
import { ctx } from '@app/index.js'
import { CID } from 'ipfs-http-client'


export type Directory = {
  files?: Map<string, Buffer>;
  directories?: Map<string, Directory>;
}

export type Shareable = Map<string,Directory | Buffer> 

export function traverseShareable(shareable: Shareable, indent = ``): void {
    const entries: any[] = []

    for (const [key, value] of shareable.entries()) {
        if (value instanceof Buffer) {
            entries.push(key)
        } else {
            entries.push({ [key]: traverseDirectory(value) })
        }
    }
    
}

function traverseDirectory(directory: Directory): any {
    const entries: any[] = []
    if (directory.files) {
        const files = new Map(Object.entries(directory.files))
        for (const [fileName, _buffer] of files.entries()) {
            entries.push(fileName)
        }
    }

    if (directory.directories) {
        for (const [dirKey, dirValue] of directory.directories.entries()) {
            entries.push({ [dirKey]: traverseDirectory(dirValue) })
        }
    }

    return entries
}



export class DagOperator{
        
    static async addEncryptedObject (cleartext: Shareable, dids: string[])  {
        if (!ctx.did) throw new Error(`DID not initialized`)
        if (!ctx.ipfs?.api) throw new Error(`IPFS not initialized`)
        const jwe = await ctx.did.createDagJWE(cleartext, dids)
        logger.debug(`JWE: ${JSON.stringify(jwe)}`)
        const dagCID = await ctx.ipfs.api.dag.put(jwe, { storeCodec: `dag-jose`, hashAlg: `sha2-256` })
        console.log(`DAG CID: ${dagCID}`)

    }
        
    static async getEnctrypedObject(cid: CID): Promise<Shareable>{
        if (!ctx.did) throw new Error(`DID not initialized`)
        if (!ctx.ipfs) throw new Error(`IPFS not initialized`)
        const jwe = (await ctx.ipfs.api.dag.get(cid)).value
        const shareable = await ctx.did?.decryptDagJWE(jwe)
        const shareableMap = new Map(Object.entries(shareable))
        return shareableMap
    }
}
