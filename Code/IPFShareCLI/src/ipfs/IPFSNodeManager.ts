
import { isPortInUse } from "@app/common/utils.js"
import { ctx } from "@app/index.js"
import { getOrbitDB } from "@app/orbitdb/orbitdb.js"
import { UserRegistry } from "@app/registry.js"
import { IPFShareLog } from "@app/shareLog.js"
import { getAppConfigAndPromptIfUsernameInvalid } from "@common/appConfig.js"
import { logger } from "@common/logger.js"
import { newNodeConfig } from "@ipfs/ipfsNodeConfigs.js"
import fs from "fs"
import * as goIPFSModule from "go-ipfs"
import type { ControllerType, Factory, IPFSOptions } from "ipfsd-ctl"
import * as Ctl from "ipfsd-ctl"
import * as KuboRPCModule from "kubo-rpc-client"
import { IPFS } from "kubo-rpc-client/dist/src/types"
import net from "node:net"
import path from "node:path"
import psList from "ps-list"

class IPFSNodeManager {
    // mainNode!: Controller<ControllerType>
    factory: Factory<ControllerType> | undefined
    private currentConfig: IPFSOptions | undefined
    private nodes: IPFS[] = []
    private apiPort = 5002
    private swarmPort = 4002
    private gatewayPort = 8090
   

    private static getRepoPath() { 
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error("IPFSHARE_HOME is not defined")
        }
        return path.join(process.env.IPFSHARE_HOME, "ipfsRepo")
    }

    private newConfig(type: "go" | "js" = "js"): IPFSOptions {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error("IPFSHARE_HOME is not defined")
        }
        const config = newNodeConfig(type, { apiPort: this.apiPort, swarmPort: this.swarmPort, gateawayPort: this.gatewayPort })
        const ipfsBaseOptions: IPFSOptions = {
            repo: IPFSNodeManager.getRepoPath(),
            config: config,
            init: {
                allowNew: true,
            }
        }
        this.swarmPort += 2
        this.apiPort += 1
        this.gatewayPort += 1
        this.currentConfig = ipfsBaseOptions
        return ipfsBaseOptions
    }
    public async createNode() {
        if (!this.factory) {
            this.factory = await this.createFactory()
        }
        const repoPath = IPFSNodeManager.getRepoPath()
        
        let nodeConfig: IPFSOptions = { repo: repoPath }
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath)
            if (!fs.existsSync(repoPath)) {
                throw new Error("Could not create repo path")
            }
            logger.info("New repo crated")
            nodeConfig = this.newConfig("go")
        }
        logger.debug(`Spawning node, current number of nodes: ${this.factory.controllers.length}`)
        logger.debug(`Selected repo ${repoPath}`)
        const ipfs = await this.factory.spawn({ type: "go", ipfsOptions: nodeConfig,  })
            .catch((err) => {
                logger.error("erorr spawning node", err)
                throw err
            })
        await ipfs.init().catch((err) => {
            logger.error("error in node init", err)
            throw err
        })        
        return ipfs
    }


    private async createFactory() {
        
        return Ctl.createFactory(
            {
                type: "go", // default type, can be overridden per spawn
                disposable: false,
                test: false,
                remote: false,
                kuboRpcModule: KuboRPCModule,
                // ipfsHttpModule: ipfsHTTpModule,
            },
            {
                go: {
                    ipfsBin: goIPFSModule.path(),
                },
               
            },
        )
    }
    
    public static async isDaemonRunning(): Promise<boolean> {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error("Setup was run but IPFShare home is not set")
        }
        const repoLockPath = path.join(process.env.IPFSHARE_HOME, "ipfsRepo", "repo.lock")
        const apiFilePath = path.join(process.env.IPFSHARE_HOME, "ipfsRepo", "api")
        try {
            // apiFilePath contains a line like this one: /ip4/127.0.0.1/tcp/5001
            const portMatch = fs.readFileSync(apiFilePath).toString().match(/(\d+)(?!.*\d)/) // port 
            if (portMatch === null) return false
            const apiPort = parseInt(portMatch[0])
            return fs.existsSync(repoLockPath) && await isPortInUse(apiPort)
        } catch (error) {
            return false
        }
    }

    private static createOrbitDBService() {
        const server = net.createServer(socket => {
            socket.on("data", data => {
                const message = data.toString()

                if (message === "pauseOrbitDB") {
                    (async () => {
                        logger.info("Pausing OrbitDB")
                        if (!ctx.orbitdb) throw new Error("OrbitDB is not initialized")
                        await ctx.orbitdb.disconnect()
                        if (!process.env.IPFSHARE_HOME) throw new Error("IPFShare home is not set")
                        ctx.identity?.provider.keystore.close()
                        socket.write("OrbitDB paused")
                    })()
                }
                else if (message === "resumeOrbitDB") {
                    (async () => {
                        logger.info("Resuming OrbitDB")
                        if (!ctx.ipfs) throw new Error("IPFS is not initialized")
                        ctx.orbitdb = await getOrbitDB(true)
                        ctx.registry = new UserRegistry(ctx.ipfs.api, ctx.orbitdb)
                        await ctx.registry.open()
                        logger.info("Replicating registry")
                        await ctx.registry.replicate()
                        ctx.shareLog = new IPFShareLog(ctx.ipfs.api, ctx.orbitdb, "ipfs-sharelog")
                        await ctx.shareLog.open()
                    })()
                }
            })
            socket.on("error", err => {
                logger.error("Error in OrbitDB service", err)
                throw err
            })
        })

        return server
    }


    public async startDaemon(): Promise<void> {
        const service = IPFSNodeManager.createOrbitDBService()
        service.listen(3000, "localhost", () => { 
            logger.info("OrbitDB service listening on port 3000")
        })
        let daemon = await this.createNode()
        daemon = await daemon.start()
            .catch((err) => { 
                logger.error("Error launching daemon", err) 
                process.exit(1)
            })
        daemon.subprocess?.stdout?.pipe(process.stdout)
        daemon.subprocess?.stderr?.pipe(process.stderr)
        daemon.subprocess?.setMaxListeners(Infinity)
        logger.debug(`IPFS Daemon started with pid ${daemon.subprocess?.pid}`)
        ctx.ipfs = daemon
        ctx.orbitdb = await getOrbitDB(true)
        ctx.registry = new UserRegistry(ctx.ipfs.api, ctx.orbitdb)
        logger.info("Replicating registry")
        await ctx.registry.open()
        await ctx.registry.replicate()
        ctx.shareLog = new IPFShareLog(ctx.ipfs.api, ctx.orbitdb, "ipfs-sharelog")
        await ctx.shareLog.open()
        ctx.appConfig = await getAppConfigAndPromptIfUsernameInvalid(true)
        process.on("SIGINT", () => {
            (async () => {
                logger.info("Killing daemon")
                await daemon.stop()
                fs.rmSync(path.join(IPFSNodeManager.getRepoPath(), "api"), {force:true})
                await ctx.orbitdb?.disconnect()
                process.exit(0)
            })()
        })

        process.on("beforeExit", () => {
            (async () => {
                logger.info("Daemon exiting")
                await daemon.stop()
                fs.rmSync(path.join(IPFSNodeManager.getRepoPath(), "api"), {force:true})
                process.exit(0)
            })()
        })
        
    }

    public static async stopDaemon(): Promise<void> {
        // get the pid of the daemon
        const pid = await psList().then((list) => {
            const daemon = list.find((someProcess) => someProcess.name.includes("node_modules/go-ipfs/bin/ipfs"))
            if (daemon === undefined) {
                return undefined 
            }
            return daemon.pid
        })
        if (pid === undefined) {
            console.error("Could not find daemon")
            return
        }
        // kill the daemon
        process.kill(pid)
    }
}

export { IPFSNodeManager }
