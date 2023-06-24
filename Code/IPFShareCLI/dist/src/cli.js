import { ctx } from './index.js';
import { daemonPromptIfNeeded, notSetupPrompt, setupPrompt } from './setup.js';
import { Command, Option } from '@commander-js/extra-typings';
import { getBuffersFromFiles, withContext } from './common/utils.js';
import { IPFSNodeManager } from './ipfs/IPFSNodeManager.js';
import { DagOperator } from './ipfs/dagOperations.js';
import chalk from 'chalk';
import figlet from 'figlet';
import fs from 'fs';
import { CID } from 'ipfs-http-client';
import path from 'path';
import { addKnownPeer, getRegistryInfo, listFriends, removeKnownPeer } from './friends.js';
import { determineAddress } from './orbitdb/orbitdb.js';
chalk.level = 3;
const logo = figlet.textSync(`IPFShare`, { font: `Georgia11`, horizontalLayout: `default`, verticalLayout: `default` });
const program = new Command();
program
    .version(`0.0.1`)
    .name(`ipfshare`)
    .addHelpText(`before`, `${chalk.yellow(logo)}`)
    .addHelpText(`before`, `An IPFS-based, encrypted file sharing CLI tool\n`)
    .action(async () => {
    // default action (no arguments or options specified)
    // checks if the program is setup, if not, asks the user if they want to setup
    // after setup, the user is prompted to start the daemon
    // if the daemon is not running the user is prompted to start it
    await notSetupPrompt();
    await daemonPromptIfNeeded(); // checks if the daemon is running, if not it will prompt the user to start it
    program.help();
});
program.on(`command:*`, () => {
    console.error(`Invalid command: %s\nSee --help for a list of available commands.`, program.args.join(` `));
    process.exit(1);
});
// TODO add more description
program.command(`setup`)
    .summary(`Run initial setup`)
    .description(`Runs the initial setup:
    - Creates IPFShare home folder. This is where all files/folders program related are located
    - Generate the IPFS repository and config
    - Generates encryption keys
    - Etc.`)
    .argument(`[path]`, `Path to IPFShare home folder`, `~/.ipfshare`) // Square brackets around the argument make it optional
    .action((path) => {
    setupPrompt(path);
});
const daemonCommand = program.command(`daemon`)
    .summary(`Start the Kubo (go-ipfs) daemon. This is a custom daemon for IPFShare. See daemon --help for more info.`)
    .description(`Starts the Kubo (go-ipfs) daemon. When no instances of the daemon are running, a new instance is spawned. Fails if an instance is already running.
        When first running the program after setup or resetup, the user is prompted to start the daemon. If no instances are running the user is prompted to start the dameon.`)
    .argument(`<action>`, `Action to perform. Can be 'start' or 'stop'.`)
    // .option(`-s, --silent`, `Start the daemon silently. No output is shown.`)
    // .option(`-b, --background`, `Start the daemon in the background. This launches another process no output is shown.`)
    .action(async (arg) => {
    if (arg === `start`) {
        const manager = new IPFSNodeManager();
        await manager.startDaemon();
    }
    if (arg === `stop`) {
        IPFSNodeManager.stopDaemon();
    }
});
program.command(`share`)
    .summary(`Upload a file or folder`)
    .description(`Uploads a file or folder to IPFS. The file or folder is encrypted and uploaded to IPFS. The hash is then added to the user's IPFShare index.`)
    .argument(`[path...]`, `Path to file or folder to upload`)
    .action(async (path) => {
    // if empty path array
    if (!path || path.length === 0) {
        program.help();
    }
    await withContext(async () => {
        const bufferMap = getBuffersFromFiles(path);
        if (ctx.identity == null)
            throw new Error(`Identity is null`);
        const cid = await DagOperator.addEncryptedObject(bufferMap, [ctx.identity.id]);
        console.log(`Added ${cid} to IPFS`);
    });
});
program.command(`get`)
    .summary(`Download a file or folder`)
    .description(`Downloads a file or folder from IPFS. The file or folder is decrypted and downloaded from IPFS.`)
    .argument(`[cids...]`, `CID of file or folder to download`)
    .action(async (cids) => {
    // if empty cid array
    if (!cids || cids.length === 0) {
        program.help();
    }
    await withContext(async () => {
        for (const strCid of cids) {
            const cid = CID.parse(strCid);
            const bufferMap = await DagOperator.getEnctrypedObject(cid);
            console.log(bufferMap);
        }
    });
});
program.command(`cat`)
    .summary(`Print the contents of a given CID`)
    .description(`Prints the contents of a given CID. The CID must be an encrypted jwt.`)
    .argument(`[cids...]`, `CID of file or folder to cat`)
    .action(async (cids) => {
    // if empty cid array
    if (!cids || cids.length === 0) {
        program.help();
    }
    await withContext(async () => {
        for (const strCid of cids) {
            const cid = CID.parse(strCid);
            const bufferMap = await DagOperator.getEnctrypedObject(cid);
            const isBuffer = (bufferMap.entries().next().value[1] instanceof Buffer);
            if (bufferMap.size !== 1 || !isBuffer) {
                console.log(`The given CID corresponds to a folder. Use 'ipfshare ls' to show the contents of the folder.`);
                process.exit(0);
            }
            for (const [key, value] of bufferMap.entries()) {
                console.log(`\n${key}\n`);
                console.log(value.toString());
            }
        }
    });
});
program.command(`download`)
    .summary(`Print the contents of a given CID`)
    .description(`Prints the contents of a given CID. The CID must be an encrypted jwt.`)
    .argument(`[cids...]`, `CID of file or folder to cat`)
    .addOption(new Option(`-o, --output <path>`, `Output path`))
    .action(async (cids, command) => {
    // if empty cid array
    if (!cids || cids.length === 0) {
        console.log(`No cids provided`);
        program.help();
        process.exit(1);
    }
    if (command.output == null || command.output === undefined || command.output === ``) {
        console.log(`No output path provided`);
        program.help();
        process.exit(1);
    }
    const outPath = command.output;
    fs.mkdirSync(outPath, { recursive: true });
    await withContext(async () => {
        for (const strCid of cids) {
            const cid = CID.parse(strCid);
            const bufferMap = await DagOperator.getEnctrypedObject(cid);
            for (const [entryPath, buffer] of Object.entries(bufferMap)) {
                const filePath = path.join(outPath, entryPath);
                fs.writeFileSync(filePath, buffer.toString(`utf-8`));
            }
        }
    });
});
const friendsCommand = program.command(`friends`)
    .summary(`Manage friends`)
    .description(`Manage friends. Friends are other IPFShare users that you have added. You can add, remove, and list friends.`)
    .addOption(new Option(`-a, --add <friend...>`, `Add friends`))
    .addOption(new Option(`-rm, --remove <friends...>`, `Remove friends`))
    .addOption(new Option(`-l, --list`, `List friends`))
    .action(async (options, command) => {
    // if empty options object
    if (!options || Object.keys(options).length === 0) {
        command.help();
    }
    withContext(async () => {
        if (options.add)
            return addKnownPeer(options.add);
        if (options.remove)
            return await removeKnownPeer(options.remove);
        if (options.list)
            return await listFriends();
    });
});
program.command(`info`)
    .summary(`Provides information about the running ipfshare instance such as DID and peerID`)
    .action(async () => {
    withContext(async () => {
        console.log(`DID: ${ctx.identity?.toJSON().id}}`);
        console.log(`PeerID: ${ctx.ipfs?.peer.id}`);
        await getRegistryInfo();
        console.log(`${await determineAddress()}`);
    });
});
export { program };
//# sourceMappingURL=cli.js.map