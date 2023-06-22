// import { DaemonCommandOptions } from '@app/cli.js'
import { ctx } from '@app/index.js'
import { IPFSNodeManager } from '@app/ipfs/IPFSNodeManager.js'
import { DagOperator } from '@app/ipfs/dagOperations.js'
import { getOrbitDB } from '@app/orbitdb.js'
import { logger } from '@common/logger.js'
import fs from 'fs'
import { createServer } from 'net'
import { spawn } from 'node:child_process'
/**
 * Checks if a given port is in use. Tries to craete a server and bind it to the port, if successful, closes the server, meaning the specified port it's not in use.
 * @param {number} port - The port number to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the port is in use, `false` otherwise.
 */
export const isPortInUse = async (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = createServer()
            .once(`error`, () => resolve(true))
            .once(`listening`, () => {
                server.close()
                resolve(false)
            })
            .listen(port)
    })
}

export async function initializeContext() {
    if (ctx.manager === undefined) {
        ctx.manager = await new IPFSNodeManager()
        const ipfs = await ctx.manager.createNode()
        ;(await ipfs).start()
        ctx.ipfs = ipfs
        ctx.orbitdb = await getOrbitDB()
        ctx.dagOperator = await new DagOperator().create()
    }
}

function isDirectorySync(path: string) {
    try {
        const stats = fs.statSync(path)
        return stats.isDirectory()
    } catch (err) {
        logger.error(err)
        throw err
    }
}


export function getBuffersFromFiles(paths: string[]) {
    if (!paths.length) throw new Error(`No files provided`)
    const bufferMap: Map<string, Buffer> = new Map()
    for (const path of paths) {
        if (fs.existsSync(path)) {
            //check if the path is a directory, if it is, get all the files in it
            if (!isDirectorySync(path)) {
                const buffer = fs.readFileSync(path)
                bufferMap.set(path, buffer)
                continue
            }
            throw new Error(`Path ${path} is a directory, directories are not supported yet`)
        }
    }
    return bufferMap
}

export async function relaunchAsDaemon (): Promise<void> {
    if ( !process.argv[0] || !process.argv[1]) process.exit(1)
    const command = process.argv[0]
    // if (options.background) {
    // launch a dettached process which executes the application with the daemon comand
    const out = fs.openSync(`./daemon.log`, `a`)
    const err = fs.openSync(`./daemon.log`, `a`)
    logger.debug(`${process.argv} daemon `)
    const daemon = spawn(command, [process.argv[1], `daemon`], { detached: true, stdio: [`ignore`, out, err] })
    logger.info(`Daemon parent process launched with pid ${daemon.pid}`)
    daemon.unref() 
    // }
          
}