import chalk from "chalk";
import { logger } from './common/logger.js';
import { initializeContext } from "./common/utils.js";
import { ctx } from "./index.js";
import { getOrbitDB } from "./orbitdb.js";
function parsePeersForAliases(peers) {
    const parsedPeers = [];
    for (const peer of peers) {
        const [peerId, alias] = peer.split(`:`);
        if (!peerId || !alias)
            throw new Error(`Invalid peer format: ${peer}`);
        parsedPeers.push({ peerId, alias });
    }
    return parsedPeers;
}
export async function addKnownPeer(peers) {
    logger.info(`Adding peers ${peers}`);
    const parsedPeers = parsePeersForAliases(peers);
    await initializeContext();
    const orbit = ctx.orbitdb ?? await getOrbitDB();
    const peersDB = await orbit.keyvalue(`friends`);
    await peersDB.load();
    for (const { peerId, alias } of parsedPeers) {
        const res = await peersDB.put(alias, { peerId, alias });
        console.log(chalk.green(`Added ${alias} with peerId ${peerId}`));
        logger.debug(`transaction result ${res}`);
    }
    await orbit.disconnect();
}
export async function removeKnownPeer(peers) {
    const orbit = await getOrbitDB();
    const peersDB = await orbit.keyvalue(`friends`);
    await peersDB.load();
    const parsedPeers = parsePeersForAliases(peers);
    for (const { peerId, alias } of parsedPeers) {
        await peersDB.del(alias, {});
    }
}
export async function listFriends() {
    const orbit = await getOrbitDB();
    const peersDB = await orbit.keyvalue(`friends`);
    await peersDB.load();
    const peers = peersDB.all;
    // for each peer, print the alias and peerId
    console.log(peers);
}
//# sourceMappingURL=friends.js.map