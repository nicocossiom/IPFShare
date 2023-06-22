import { logger } from '@app/common/logger.js'
import { ctx } from '@app/index.js'
import { createHash } from 'crypto'
import { DID } from 'dids'
import { CID } from 'ipfs-http-client'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import KeyResolver from 'key-did-resolver'

export class DagOperator{
    did: DID = undefined as unknown as DID
    async create() {
        this.did = await this.createDidAndAuth()
        return this
    }
        
    async createDidAndAuth(): Promise<DID> {
        if (!ctx.ipfs?.api) throw new Error(`IPFS not initialized`)
        const peerId = await ctx.ipfs.peer.id.toBytes()
        const seed = createHash(`sha256`).update(peerId).digest()
        const provider = new Ed25519Provider(seed)
        const did = new DID({ provider, resolver: KeyResolver.getResolver() })
        const auth_did = await did.authenticate()
            .catch (err => {
                throw new Error(`Failed to authenticate DID ${err}}`)
            })
        logger.info(`DID authenticated: ${auth_did}`)
        return did
    }

    async addEncryptedObject (cleartext: Record<string, Buffer>, dids: string[])  {
        if (!this.did) throw new Error(`DID not initialized`)
        if (!ctx.ipfs?.api) throw new Error(`IPFS not initialized`)
        const jwe = await this.did.createDagJWE(cleartext, dids)
        return ctx.ipfs.api.dag.put(jwe, { storeCodec: `dag-jose`, hashAlg: `sha2-256` })
    }
        
    async getEnctrypedObject(cid: CID) {
        if (!this.did) throw new Error(`DID not initialized`)
        if (!ctx.ipfs) throw new Error(`IPFS not initialized`)
        const jwe = (await ctx.ipfs.api.dag.get(cid)).value
        const cleartext = await this.did?.decryptDagJWE(jwe)
        return cleartext
    }
}
