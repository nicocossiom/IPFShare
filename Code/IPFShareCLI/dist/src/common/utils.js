// import { DaemonCommandOptions } from '../cli.js'
import { ctx } from '../index.js';
import { IPFSNodeManager } from '../ipfs/IPFSNodeManager.js';
import { getOrbitDB } from '../orbitdb/orbitdb.js';
import { logger } from './logger.js';
import { spawn } from 'child_process';
import fs from 'fs';
import { createServer } from 'net';
import path from 'path';
/**
 * Checks if a given port is in use. Tries to craete a server and bind it to the port, if successful, closes the server, meaning the specified port it's not in use.
 * @param {number} port - The port number to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the port is in use, `false` otherwise.
 */
export const isPortInUse = async (port) => {
    return new Promise((resolve) => {
        const server = createServer()
            .once(`error`, () => resolve(true))
            .once(`listening`, () => {
            server.close();
            resolve(false);
        })
            .listen(port);
    });
};
// this method gets a function that is execture after initializing the context if needed and deinitializing it after the function is executed
export async function withContext(fn) {
    await initializeContext();
    await fn();
    await deInitializeContext();
}
export async function initializeContext() {
    if (ctx.manager === undefined) {
        ctx.manager = await new IPFSNodeManager();
        let ipfs = await ctx.manager.createNode();
        // remove ipfshare/ap
        // rmSync(`${ipfs.path}/api`, {force: true})
        ipfs = await ipfs.start().catch((err) => {
            logger.error(err);
            throw err;
        });
        ctx.ipfs = ipfs;
        // ctx.dbAddress = await determineAddress()
        ctx.orbitdb = await getOrbitDB();
    }
}
export async function deInitializeContext() {
    await ctx.orbitdb?.disconnect();
}
function isDirectorySync(path) {
    try {
        const stats = fs.statSync(path);
        return stats.isDirectory();
    }
    catch (err) {
        logger.error(err);
        throw err;
    }
}
function readDirectoryRecursively(directoryPath) {
    const directory = {};
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name);
        if (entry.isFile()) {
            // If it's a file, read its contents and add it to the directory's files
            const fileContent = fs.readFileSync(entryPath);
            if (!directory.files) {
                directory.files = new Map();
            }
            directory.files.set(entry.name, fileContent);
        }
        else if (entry.isDirectory()) {
            // If it's a directory, recursively read its contents and add it to the directory's directories
            const subDirectory = readDirectoryRecursively(entryPath);
            if (!directory.directories) {
                directory.directories = new Map();
            }
            directory.directories.set(entry.name, subDirectory);
        }
    }
    return directory;
}
export function getBuffersFromFiles(paths) {
    if (!paths.length)
        throw new Error(`No files provided`);
    const bufferMap = new Map();
    for (const path of paths) {
        if (fs.existsSync(path)) {
            //check if the path is a directory, if it is, get all the files in it
            if (!isDirectorySync(path)) {
                const buffer = fs.readFileSync(path);
                bufferMap.set(path, buffer);
                continue;
            }
            const dir = readDirectoryRecursively(path);
            bufferMap.set(path, dir);
        }
    }
    return bufferMap;
}
export async function relaunchAsDaemon() {
    if (!process.argv[0] || !process.argv[1])
        process.exit(1);
    const command = process.argv[0];
    logger.debug(`${process.argv} daemon start`);
    const daemon = spawn(command, [process.argv[1], `daemon`, `start`], { detached: true });
    logger.info(`Daemon parent process launched with pid ${daemon.pid}`);
    daemon.unref();
}
//# sourceMappingURL=utils.js.map