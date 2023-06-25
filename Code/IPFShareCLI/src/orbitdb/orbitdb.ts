import { logger } from '@app/common/logger.js'
import { ctx } from '@app/index.js'
import fs from 'fs'
import path from 'node:path'
import OrbitDB from "orbit-db"

export async function getOrbitDB(daemon = false): Promise<OrbitDB> {
    if (ctx.orbitdb) return ctx.orbitdb
    // const ipfs = create({ url: `http://localhost:5002` })
    // see if the orbitdb folder exists
    const ipfshareHome = process.env.IPFSHARE_HOME
    if (ipfshareHome === undefined) throw new Error(`IPFSHARE_HOME is not defined`)
    let orbitdbPath = path.join(ipfshareHome, `orbitdb`)
    if (!fs.existsSync(orbitdbPath)) {
        fs.mkdirSync(orbitdbPath)
        if (!fs.existsSync(orbitdbPath)) {
            throw new Error(`Could not create orbitdb path`)
        }
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // const identity = await getIdentity()
    // ctx.identity = identity
    if (ctx.ipfs === undefined || ctx.ipfs == null) throw new Error(`IPFS Node not initialized`)
    if (daemon) orbitdbPath = path.join(orbitdbPath, `daemon`)
    else orbitdbPath = path.join(orbitdbPath, `node`)
    logger.debug(`orbitdbPath: ${orbitdbPath}`)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore 
    const orbit = await OrbitDB.createInstance(ctx.ipfs.api, { 
        // directory: orbitdbPath, 
        peerId: ctx.ipfs.peer.id.toString(),
        
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

export async function listenOnDB() {
    ctx.orbitdb = await getOrbitDB(true)
    const peersDB = await ctx.orbitdb.open(`/orbitdb/zdpuAzWtyxYDTVivt9osNqRGLncm9xmJAoWJXpwct5z1U9qTs/IPFShareGlobalRegistry`)
    logger.debug(`Connected to Peers DB address: ${peersDB.address.root}/${peersDB.address.path}. Registry expected /orbitdb/zdpuAzWtyxYDTVivt9osNqRGLncm9xmJAoWJXpwct5z1U9qTs/IPFShareGlobalRegistry`)
    await peersDB.load()
    peersDB.events.on(`replicated`, (address) => {
        logger.info(`Peers DB replicated ${address} `)
        logger.info(`PeersDB replication status: \n\tprogress:${peersDB.replicationStatus.progress}\n\tqueued${peersDB.replicationStatus.queued}`)
    })
    peersDB.events.on(`replicate`, (address) => {
        logger.info(`Peers DB replicate ${address} `)
        logger.info(`PeersDB replication status: \n\tprogress:${peersDB.replicationStatus.progress}\n\tqueued${peersDB.replicationStatus.queued}`)
    })
    peersDB.events.on(`peer`, (peer) => {
        logger.info(`Peers DB peer connected ${peer}`)
        logger.info(`PeersDB replication status: \n\tprogress:${peersDB.replicationStatus.progress}\n\tqueued${peersDB.replicationStatus.queued}`)
    })
    peersDB.events.on(`replicate.progress`, (address, hash, entry, progress, have) => {
        logger.info(`Peers DB replication progress ${address}, ${hash}, ${entry}, ${progress}, ${have}`)
        logger.info(`PeersDB replication status: \n\tprogress:${peersDB.replicationStatus.progress}\n\tqueued${peersDB.replicationStatus.queued}`)
    })
    peersDB.events.on(`peer.exchanged`, (peer, address, heads) => {
        logger.info(`Peers DB peer exchanged ${peer}, ${address}, ${heads}`)
        logger.info(`PeersDB replication status: \n\tprogress:${peersDB.replicationStatus.progress}\n\tqueued${peersDB.replicationStatus.queued}`)
    } )
}


