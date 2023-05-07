// import { DaemonCommandOptions } from '@app/cli.js'
import { ctx } from '@app/index.js'
import { IPFSNodeManager } from '@app/ipfs/IPFSNodeManager.js'
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
    }
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