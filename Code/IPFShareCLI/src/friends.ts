import { ctx } from '@app/index.js'
import chalk from "chalk"
import { initializeContext } from "./common/utils.js"
import { getOrbitDB } from "./orbitdb.js"

type PeerDocument = { peerId: string , alias: string}


function parsePeersForAliases(peers: string[]){
    const parsedPeers = []
    for (const peer of peers) {
        const [peerId, alias] = peer.split(`:`)
        if (!peerId || !alias) throw new Error(`Invalid peer format: ${peer}`)
        parsedPeers.push({peerId, alias})
    }
    return parsedPeers
}
export async function addKnownPeer(peers: string[]) {
    const parsedPeers = parsePeersForAliases(peers)
    await initializeContext()
    const orbit = ctx.orbitdb ?? await getOrbitDB()
    const peersDB = await orbit.keyvalue<PeerDocument>(`friends`)
    await peersDB.load()
    for (const {peerId, alias} of parsedPeers) {
        const res = await peersDB.put(alias, { peerId, alias })
        console.log(chalk.green(`Added ${alias} with peerId ${peerId}`))
    }
}

export async function removeKnownPeer(peers: string[]) {
    const orbit = await getOrbitDB()
    const peersDB = await orbit.keyvalue<PeerDocument>(`friends`)
    await peersDB.load()
    const parsedPeers = parsePeersForAliases(peers)
    for (const {peerId, alias} of parsedPeers) {
        await peersDB.del(alias, {})
    }
}

export async function listFriends() {
    const orbit = await getOrbitDB()
    const peersDB = await orbit.keyvalue<PeerDocument>(`friends`)
    await peersDB.load()
    const peers = peersDB.all
    // for each peer, print the alias and peerId
    console.log(peers)
}

