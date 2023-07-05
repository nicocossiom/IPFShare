
import { logger } from "@app/common/logger.js"
import { ctx } from "@app/index.js"
import { DID } from "dids"
import { Ed25519Provider } from "key-did-provider-ed25519"
import KeyResolver from "key-did-resolver"
import Identities from "orbit-db-identity-provider"
export interface Key {
  id: string
  name: string
}

export async function getIdentity(orbitdbPath: string){
    if (ctx.ipfs === undefined) throw new Error("IPFS not initialized")
    const keys = await ctx.ipfs.api.key.list()

    // get the key named 'self'
    const key = keys.find(k => k.name === "self")
    if (key === undefined) throw new Error("Key 'self' not found")
    const resolver = KeyResolver.getResolver()
    
    const keyIdBuffer = Buffer.from(key.id.slice(0, 32))
    const didProvider = new Ed25519Provider(keyIdBuffer)
    const did = new DID({ provider: didProvider, resolver: resolver })
    did.setResolver(resolver)
    logger.debug(`DID authenticated: ${await did.authenticate()}`)
    ctx.did = did
    const identity = await Identities.createIdentity({ type: "DID", did: did, provider: didProvider, resolver: resolver, identityKeysPath: orbitdbPath})  
    ctx.identity = identity
    return identity
}