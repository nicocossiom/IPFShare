// import { DaemonCommandOptions } from '@app/cli.js'
import { ctx } from "@app/index.js"
import { IPFSNodeManager } from "@app/ipfs/IPFSNodeManager.js"
import { getOrbitDB } from "@app/orbitdb/orbitdb.js"
import { UserRegistry } from "@app/registry.js"
import { IPFShareLog } from "@app/shareLog.js"
import { getAppConfigAndPromptIfUsernameInvalid } from "@common/appConfig.js"
import { logger } from "@common/logger.js"
import { spawn } from "child_process"
import { Controller } from "ipfsd-ctl"
import { createServer } from "net"
import net from "node:net"
/**
 * Checks if a given port is in use. Tries to craete a server and bind it to the port, if successful, closes the server, meaning the specified port it's not in use.
 * @param {number} port - The port number to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the port is in use, `false` otherwise.
 */
export const isPortInUse = async (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = createServer()
            .once("error", () => resolve(true))
            .once("listening", () => {
                server.close()
                resolve(false)
            })
            .listen(port)
    })
}
// this method gets a function that is execture after initializing the context if needed and deinitializing it after the function is executed
export async function withContext(fn: () => Promise<void>) {
    await initializeContext()
    await fn()
    await deInitializeContext()
}

export async function initializeContext() {
    if (ctx.manager === undefined) {
        ctx.manager = await new IPFSNodeManager()
        let ipfs : Controller<"go"> = await ctx.manager.createNode()
        ipfs = await ipfs.start().catch((err) => {
            logger.error(err)
            throw err
        })
        ctx.ipfs = ipfs
        ctx.daemonSocket = new net.Socket()
        ctx.daemonSocket.connect(3000, "localhost", () => {
            logger.info("Connected to the daemon process.") 
        })
        await sendMessageToOrbitDBService("pauseOrbitDB")
        ctx.orbitdb = await getOrbitDB()
        
        ctx.registry = new UserRegistry(ctx.ipfs.api, ctx.orbitdb)
        await ctx.registry.open()
        ctx.shareLog = new IPFShareLog(ctx.ipfs.api, ctx.orbitdb, "ipfs-sharelog")
        await ctx.shareLog.open()
        
        ctx.appConfig = await getAppConfigAndPromptIfUsernameInvalid()
    }
}
export async function deInitializeContext() {
    await ctx.registry?.store.close()
    await ctx.shareLog?.store.close()
    if (!ctx.orbitdb) throw new Error("OrbitDB instance undefined, not closed yet, should not happen")
    ctx.identity?.provider.keystore.close()
    await ctx.orbitdb?.disconnect()
    ctx.daemonSocket?.write("resumeOrbitDB")
    process.exit(0)
}

function sendMessageToOrbitDBService(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (ctx.daemonSocket === undefined ) throw new Error("Daemon socket is undefined")
        ctx.daemonSocket.once("data", data => {
            // Handle any response or acknowledgment from the daemon process
            const response = data.toString()
            logger.debug(`Received response for message ${message}:`, response)
            resolve(response)
        })

        ctx.daemonSocket.write(message, error => {
            if (error) {
                console.error("Error sending message:", error.message)
                reject(error)
            }
            logger.debug(`Sent message ${message}`)
        })
    })
}



export async function relaunchAsDaemon (): Promise<void> {
    if ( !process.argv[0] || !process.argv[1]) process.exit(1)
    const command = process.argv[0]
    logger.debug(`${process.argv} daemon start`)
    const daemon = spawn(command, [process.argv[1], "daemon", "start"], { detached: true  })
    logger.info(`Daemon parent process launched with pid ${daemon.pid}`)
    daemon.unref() 
}