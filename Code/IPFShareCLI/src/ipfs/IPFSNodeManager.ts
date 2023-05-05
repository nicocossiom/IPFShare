// import { mdns } from '@libp2p/mdns'
// import { tcp } from '@libp2p/tcp'
import { logger } from '@common/logger.js'
import { isPortInUse } from '@common/utils.js'
import * as ipfsModule from 'ipfs'
import { IPFS } from 'ipfs'
import * as ipfsHTTpModule from 'ipfs-http-client'
import type { Controller, ControllerType, Factory, IPFSOptions } from 'ipfsd-ctl'
import * as Ctl from 'ipfsd-ctl'
import * as kuboRpcModule from 'kubo-rpc-client'
import path from 'node:path'
// import { Libp2pOptions } from 'libp2p'
// import { goIpfsModule, ipfsHTTpModule, ipfsd } from '@app/ipfs/exporter.js'
import { newNodeConfig } from '@ipfs/ipfsNodeConfigs.js'
import fs from 'fs'
import assert from 'node:assert'
const goIpfsModule = await import(`go-ipfs`)
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
    
    private getRepoPath() { 
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

    private newConfig(type: `go` | `js` = `go`): IPFSOptions {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error(`IPFSHARE_HOME is not defined`)
        }
        const config = newNodeConfig(type, { apiPort: this.apiPort, swarmPort: this.swarmPort, gateawayPort: this.gatewayPort })
        const ipfsBaseOptions: IPFSOptions = {
            repo: this.getRepoPath(),
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

    // taken from https://github.com/ipfs/ipfs-desktop/blob/main/src/daemon/daemon.js
    private isSpawnedDaemonDead(ipfs: Controller<ControllerType>): boolean{
        console.log(`isSpawnedDaemonDead`)
        if (ipfs.subprocess === undefined || ipfs.subprocess === null || ipfs.subprocess.exitCode != null)
            return true
        // detect when spawned ipfs process is gone/dead
        // by inspecting its pid - it should be alive
        if (ipfs.subprocess.pid === undefined)
            return true 
        // signal 0 throws if process is missing, noop otherwise
        try {        
            process.kill(ipfs.subprocess.pid, 0)
        }
        catch (err) {
            return true
        }
        return false
    }

    public async createNode(): Promise<Controller<ControllerType>> {
        if (!this.factory) {
            this.factory = await this.createFactory()
        }
        const repoPath = this.getRepoPath()
        
        let nodeConfig: IPFSOptions = { repo: repoPath}
        const initializing = !fs.existsSync(repoPath)
        if (initializing) {
            fs.mkdirSync(repoPath)
            if (!fs.existsSync(repoPath)) {
                throw new Error(`Could not create repo path`)
            }
            logger.info(`New repo crated`)
            nodeConfig = this.newConfig()
        }
        logger.debug(`Spawning node, current number of nodes: ${this.factory.controllers.length}`)
        logger.debug(`Selected repo ${repoPath}`)
        const ipfs: Controller<`go`> = await this.factory.spawn({ type: `go`, ipfsOptions: nodeConfig })
            .catch((err) => {
                logger.error(`erorr spawning node`, err)
                throw err
            })
        await ipfs.init().catch((err) => {
            logger.error(`error in node init`, err)
            throw err
        })
        console.log(ipfs)
        await ipfs.start()
            .catch((err) => { 
                logger.error(`error in node start`, err) 
                throw err
            })
        // ipfs.subprocess?.unref()

        logger.debug(`'Node started with pid ${ipfs.subprocess?.pid}`)
        // handle sigkill
        //catch sigkill
    
        process.on(`SIGINT`, async () => {
            console.log(`SIGINT received`)
            await ipfs.stop()
            fs.rmSync(path.join(repoPath, `api`), {force:true})
            process.exit(0)
        }
        )
        return ipfs
    }
    
    private stopListeningDaemon(ipfs: Controller<`go`>) {
        if (this.isSpawnedDaemonDead(ipfs)) throw new Error(`Spawned daemon is dead`)
        assert(ipfs.subprocess !== undefined && ipfs.subprocess !== null, `Spawned daemon subprocess is undefined or null`) 
        // stop listening to spawned daemon
        


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
                kuboRpcModule: kuboRpcModule, 
                ipfsModule: ipfsModule, // only if you gonna spawn 'proc' controllers
            },
            {
                // overrides per type
                js: {
                    ipfsBin: ipfsModule.path(),
                },
                go: {
                    ipfsBin: goIpfsModule.path(),
                            
                },
                proc: {
                    ipfsClientModule: ipfsModule.path(),
                }
            },
        )
    }
    
    public static async isDaemonRunning(): Promise<boolean> {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error(`Setup was run but IPFShare home is not set`)
        }
        const repoLockPath = path.join(process.env.IPFSHARE_HOME, `ipfsRepo`, `repo.lock`)
        const apiFilePath = path.join(process.env.IPFSHARE_HOME, `ipfsRepo`, `api`)
        // apiFilePath contains a line like this one: /ip4/127.0.0.1/tcp/5001
        const portMatch = fs.readFileSync(apiFilePath).toString().match(/(\d+)(?!.*\d)/) // port 
        if (portMatch === null) return false
        const apiPort = parseInt(portMatch[0])
        return fs.existsSync(repoLockPath) && await isPortInUse(apiPort)
    }

    public static async startDaemon(): Promise<void> {
        throw new Error(`Not implemented`)
        // if (process.env.IPFSHARE_HOME === undefined) {
        //     throw new Error(`Setup was run but IPFShare home is not set`)
        // }
        // const repoLockPath = path.join(process.env.IPFSHARE_HOME, `ipfsRepo`, `repo.lock`)
            
    }

    public static async stopDaemon(): Promise<void> {
        throw new Error(`Not implemented`)
        // if (process.env.IPFSHARE_HOME === undefined) {
        //     throw new Error(`Setup was run but IPFShare home is not set`)
        // }
        // const repoLockPath = path.join(process.env.IPFSHARE_HOME, `ipfsRepo`, `repo.lock`)
            
    }
}


export { IPFSNodeManager }



