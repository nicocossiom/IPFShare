// import { mdns } from '@libp2p/mdns'
// import { tcp } from '@libp2p/tcp'
// import { DaemonCommandOptions } from '@app/cli.js'
import { isPortInUse } from '@app/common/utils.js'
import { ctx } from '@app/index.js'
import { listenOnDB } from '@app/orbitdb/orbitdb.js'
import { logger } from '@common/logger.js'
import { newNodeConfig } from '@ipfs/ipfsNodeConfigs.js'
import fs from 'fs'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as goIPFSModule from 'go-ipfs'
import * as ipfsModule from 'ipfs'
import { IPFS } from 'ipfs'
import * as ipfsHTTpModule from 'ipfs-http-client'
import type { ControllerType, Factory, IPFSOptions } from 'ipfsd-ctl'
import * as Ctl from 'ipfsd-ctl'
import net from "node:net"
import path from 'node:path'
import psList from 'ps-list'

// function libp2pConfig() {
//     /** @type { */
//     const options: Libp2pOptions = {
//         transports: [
//             tcp()
//         ],
//         peerDiscovery: [
//             mdns()
//         ],
//         connectionManager: {
//             maxParallelDials: 150, // 150 total parallel multiaddr dials
//             maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
//             dialTimeout: 10e3, // 10 second dial timeout per peer dial
//             autoDial: true
//         },
//         nat: {
//             enabled: true,
//             description: `ipfs@${os.hostname()}`
//         }
//     }
//     return options
// }



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
            throw new Error(`IPFSHARE_HOME is not defined`)
        }
        return path.join(process.env.IPFSHARE_HOME, `ipfsRepo`)
    }

    private getReposPath(type: `go` | `js` = `go`) {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error(`IPFSHARE_HOME is not defined`)
        }
        let goIPFSRepo = path.join(process.env.IPFSHARE_HOME, `goRepos`)
        goIPFSRepo = this.factory ?
            path.join(goIPFSRepo, this.factory.controllers.length.toString()) :
            path.join(goIPFSRepo, `0`)
        const repo = type === `js` ?
            path.join(process.env.IPFSHARE_HOME, `jsRepos`, this.nodes.length.toString())
            : goIPFSRepo
        return repo
    }

    private newConfig(type: `go` | `js` = `js`): IPFSOptions {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error(`IPFSHARE_HOME is not defined`)
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
        
        let nodeConfig: IPFSOptions = { repo: repoPath}
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath)
            if (!fs.existsSync(repoPath)) {
                throw new Error(`Could not create repo path`)
            }
            logger.info(`New repo crated`)
            nodeConfig = this.newConfig(`go`)
        }
        logger.debug(`Spawning node, current number of nodes: ${this.factory.controllers.length}`)
        logger.debug(`Selected repo ${repoPath}`)
        const ipfs = await this.factory.spawn({ type: `go`, ipfsOptions: nodeConfig,  })
            .catch((err) => {
                logger.error(`erorr spawning node`, err)
                throw err
            })
        await ipfs.init().catch((err) => {
            logger.error(`error in node init`, err)
            throw err
        })        
        return ipfs
    }

    public async createIPFSNode(): Promise<IPFS> {
        return await ipfsModule.create(this.nodes.length > 0 ? this.newConfig().config: this.currentConfig ).then((node: IPFS) => {
            this.nodes.push(node)
            logger.debug(`Node created, current number of nodes: `, this.nodes.length)
            return node
        })
    }

    private async createFactory() {
        
        return Ctl.createFactory(
            {
                type: `go`, // default type, can be overridden per spawn
                disposable: false,
                test: false,
                remote: false,
                ipfsHttpModule: ipfsHTTpModule,
                ipfsModule: ipfsModule, // only if you gonna spawn 'proc' controllers
            },
            {
                // overrides per type
                js: {
                    ipfsBin: ipfsModule.path(),
                },
                go: {
                    ipfsBin: goIPFSModule.path(),
                },
               
            },
        )
    }
    

    public static async isDaemonRunning(): Promise<boolean> {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error(`Setup was run but IPFShare home is not set`)
        }
        const repoLockPath = path.join(process.env.IPFSHARE_HOME, `ipfsRepo`, `repo.lock`)
        const apiFilePath = path.join(process.env.IPFSHARE_HOME, `ipfsRepo`, `api`)
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
            socket.on(`data`, data => {
                const message = data.toString()

                if (message === `pauseOrbitDB`) {
                    (async () => {
                        logger.info(`Pausing OrbitDB`)
                        ctx.orbitdb?.disconnect()
                        socket.write(`OrbitDB paused`)
                    })().catch(err => {
                        logger.error(`Error pausing OrbitDB`, err)
                    })
                } else if (message === `resumeOrbitDB`) {
                    (async () => {
                        logger.info(`Resuming OrbitDB`)
                        await listenOnDB()
                        socket.write(`OrbitDB resumed`)
                    })().catch(err => {
                        logger.error(`Error resuming OrbitDB`, err)
                    })
                }
            })
        })

        return server
    }


    public async startDaemon(): Promise<void> {
        let daemon = await this.createNode()
        const service = IPFSNodeManager.createOrbitDBService()
        service.listen(3000, `localhost`, () => { 
            logger.info(`OrbitDB service listening on port 3000`)
        })
        daemon = await daemon.start()
            .catch((err) => { 
                logger.error(`Error launching daemon`, err) 
                process.exit(1)
            })
        logger.debug(`Daemon stdio: ${daemon.subprocess?.stdout} ${daemon.subprocess?.stderr}`)
        daemon.subprocess?.stdout?.pipe(process.stdout)
        daemon.subprocess?.stderr?.pipe(process.stderr)
        daemon.subprocess?.setMaxListeners(Infinity)
        logger.info(`set max listeners to infinity, current max listeners: ${daemon.subprocess?.getMaxListeners()}`)
        logger.debug(`IPFS Daemon started with pid ${daemon.subprocess?.pid}`)        
        ctx.ipfs = daemon
        await listenOnDB()

        process.on(`SIGINT`, () => {
            (async () => {
                logger.info(`Killing daemon`)
                await daemon.stop()
                fs.rmSync(path.join(IPFSNodeManager.getRepoPath(), `api`), {force:true})
                process.exit(0)
            })()
        })

        process.on(`beforeExit`, () => {
            (async () => {
                logger.info(`Daemon exiting`)
                await daemon.stop()
                fs.rmSync(path.join(IPFSNodeManager.getRepoPath(), `api`), {force:true})
                process.exit(0)
            })()
        })
        
    }



    public static async stopDaemon(): Promise<void> {
        // get the pid of the daemon
        const pid = await psList().then((list) => {
            const daemon = list.find((someProcess) => someProcess.name.includes(`node_modules/go-ipfs/bin/ipfs`))
            if (daemon === undefined) {
                return undefined 
            }
            return daemon.pid
        })
        if (pid === undefined) {
            console.error(`Could not find daemon`)
            return
        }
        // kill the daemon
        process.kill(pid)
    }
}


export { IPFSNodeManager }



