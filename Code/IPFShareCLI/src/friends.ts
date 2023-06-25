import chalk from "chalk"
import { logger } from './common/logger.js'
import { ctx } from "./index.js"
import { getOrbitDB } from "./orbitdb/orbitdb.js"

export type PeerDocument = { peerId: string, alias: string }



export async function searchForPeers() {
    const orbit = ctx.orbitdb ?? await getOrbitDB()
    const peersDB = await orbit.keyvalue<PeerDocument>(`/orbitdb/zdpuAzWtyxYDTVivt9osNqRGLncm9xmJAoWJXpwct5z1U9qTs/IPFShareGlobalRegistry`)
    await peersDB.load()
    logger.debug(`PeersDB: ${peersDB.address.root}`)
    const peers = peersDB.all
    console.log(chalk.green(`Friends:`))
    console.log(peers)
}

function parsePeersForAliases(peers: string[]) {
    const parsedPeers = []
    for (const peer of peers) {
        const [peerId, alias] = peer.split(`:`)
        if (!peerId || !alias) throw new Error(`Invalid peer format: ${peer}`)
        parsedPeers.push({ peerId, alias })
    }
    return parsedPeers
}

export async function getRegistryInfo() {
    const orbit = ctx.orbitdb ?? await getOrbitDB()
    const peersDB = await orbit.keyvalue<PeerDocument>(`/orbitdb/zdpuAzWtyxYDTVivt9osNqRGLncm9xmJAoWJXpwct5z1U9qTs/IPFShareGlobalRegistry`)
    await peersDB.load()
    console.log(`DBAdress: ${peersDB.address.root}`)
    console.log(`DBIdentity: ${peersDB.identity.toJSON()}`)
    await peersDB.close()
}

export async function addKnownPeer(peers: string[]) {
    logger.info(`Adding peers ${peers}`)
    const parsedPeers = parsePeersForAliases(peers)
    const orbit = ctx.orbitdb ?? await getOrbitDB()
    const peersDB = await orbit.keyvalue<PeerDocument>(`/orbitdb/zdpuAzWtyxYDTVivt9osNqRGLncm9xmJAoWJXpwct5z1U9qTs/IPFShareGlobalRegistry`, {
        accessController: {
            write: [`*`], 
        },
        replicate: true, 
        localOnly: false, 
        overwrite: false, 
    })
    console.log(`ORBITDB VALID ADDRESS ${peersDB.address.root}`)
    await peersDB.load()
    for (const { peerId, alias } of parsedPeers) {
        const res = await peersDB.put(alias, { peerId, alias })
        console.log(chalk.green(`Added ${alias} with peerId ${peerId}`))
        logger.debug(`transaction result ${res}`)
    }
    await peersDB.close()
}

export async function removeKnownPeer(peers: string[]) {
    const orbit = ctx.orbitdb ?? await getOrbitDB()
    const peersDB = await orbit.keyvalue<PeerDocument>(`prueba`)
    await peersDB.load()
    const parsedPeers = parsePeersForAliases(peers)
    for (const { peerId, alias } of parsedPeers) {
        await peersDB.del(alias, {})
    }
    await peersDB.close()
}

export async function listFriends() {
    const orbit = ctx.orbitdb ?? await getOrbitDB()
    const peersDB = await orbit.keyvalue<PeerDocument>(`/orbitdb/zdpuAzWtyxYDTVivt9osNqRGLncm9xmJAoWJXpwct5z1U9qTs/IPFShareGlobalRegistry`)
    await peersDB.load()
    logger.debug(`PeersDB: ${peersDB.address.root}`)
    const peers = peersDB.all
    console.log(chalk.green(`Friends:`))
    console.log(peers)
    await peersDB.close()
}
