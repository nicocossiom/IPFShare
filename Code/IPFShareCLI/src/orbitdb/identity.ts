
import { ctx } from '@app/index.js'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import KeyResolver from 'key-did-resolver'
import Identities from 'orbit-db-identity-provider'
export interface Key {
  id: string
  name: string
}

export async function getIdentity(){
    if (ctx.ipfs === undefined) throw new Error(`IPFS not initialized`)
    const keys: [Key] = await ctx.ipfs.api.key.list()

    // get the key named 'self'
    const key = keys.find(k => k.name === `self`)
    if (key === undefined) throw new Error(`Key 'self' not found`)
    const resolver = KeyResolver.getResolver()
    
    const keyIdBuffer = Buffer.from(key.id.slice(0, 32))
    const didProvider = new Ed25519Provider(keyIdBuffer)
    const did = new DID({ provider: didProvider, resolver: resolver })
    
    const identity = await Identities.createIdentity({ type: `DID`, did: did, provider: didProvider, resolver: resolver})
    return identity
}