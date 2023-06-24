import { ctx } from '@app/index.js'
import OrbitDB from "orbit-db"

export async function getOrbitDB(): Promise<OrbitDB> {
    if (ctx.orbitdb) return ctx.orbitdb
    if (!ctx.manager) throw new Error(`IPFS Node Manager not initialized`)
    // const ipfs = create({ url: `http://localhost:5002` })
    
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // OrbitDB should be able to use the IPFS api instance provided by the ipfsd-ctl controller but it doesn't since it extends the base IPFS api class 
    // const identity = await getIdentity()
    // ctx.identity = identity
    if (ctx.ipfs === undefined || ctx.ipfs == null) throw new Error(`IPFS Node not initialized`)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore 
    const orbit = await OrbitDB.createInstance(ctx.ipfs.api, { 
        directory: process.env.IPFSHARE_HOME, 
        peerId: ctx.ipfs.peer,
        

    })
    return orbit
}

export async function determineAddress() { 
    const dbAddress = await ctx.orbitdb?.determineAddress(`IPFShareGlobalRegistry`, `keyvalue`, {
        accessController: {
            write: [`*`]
        }
    })
    return dbAddress
}


