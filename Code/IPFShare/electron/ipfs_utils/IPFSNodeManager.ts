import { mdns } from "@libp2p/mdns"
import { tcp } from "@libp2p/tcp"
import { app } from "electron"
import IPFS from "ipfs"
import type { Controller, ControllerType, Factory, IPFSOptions } from "ipfsd-ctl"
import { Libp2pOptions } from "libp2p"
import path from "node:path"
import os from "os"
import { goIpfsModule, ipfsHTTpModule, ipfsModule, ipfsd } from "../main/exporter"
import { newNodeConfig } from "./ipfsNodeConfigs"
function libp2pConfig() {
    /** @type { */
    const options: Libp2pOptions = {
        transports: [
            tcp()
        ],
        peerDiscovery: [
            mdns()
        ],
        connectionManager: {
            maxParallelDials: 150, // 150 total parallel multiaddr dials
            maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
            dialTimeout: 10e3, // 10 second dial timeout per peer dial
            autoDial: true
        },
        nat: {
            enabled: true,
            description: `ipfs@${os.hostname()}`
        }
    }
    return options
}



class IPFSNodeManager {
    // mainNode!: Controller<ControllerType>
    factory: Factory<ControllerType> | undefined
    private currentConfig: IPFSOptions | undefined
    private nodes: IPFS.IPFS[] = []
    private apiPort = 5002
    private swarmPort = 4002
    private gatewayPort = 8090
    
    private newConfig(type: "go" | "js" = "go"): IPFSOptions {
        let goIPFSRepo = path.join(app.getPath("appData"), "goRepos")
        goIPFSRepo = this.factory ?
            path.join(goIPFSRepo, this.factory.controllers.length.toString()) :
            path.join(goIPFSRepo, "0")
        const repo = type === "js" ?
            path.join(app.getPath("appData"), "jsRepos", this.nodes.length.toString())
            : goIPFSRepo
        const config = newNodeConfig(type, { apiPort: this.apiPort, swarmPort: this.swarmPort, gateawayPort: this.gatewayPort })
        console.log(config)
        // console.log(`Swarm port: ${this.swarmPort}, API port: ${this.port}`)
        // if (this.currentConfig !== undefined) {
        //     console.log(this.currentConfig.config)
        // }
        const ipfsBaseOptions: IPFSOptions = {
            repo: repo,
            config:config,

        }
        this.swarmPort += 2
        this.apiPort += 1
        this.gatewayPort += 1
        this.currentConfig = ipfsBaseOptions
        return ipfsBaseOptions
    }

    public async createNode(): Promise<Controller<ControllerType>> {
        if (!this.factory) {
            this.factory = await this.createFactory()
            console.log("Factory created")
        }
        // let config = this.newConfig() as IPFSOptions
        console.log(`Spawning node, current number of nodes: ${this.factory.controllers.length}`)
        const node = await this.factory.spawn({ type: "go", ipfsOptions: this.newConfig("go") })
            .then(async (node) => {
                console.log("Node spawned")
                return await node.init()
                    .then(async (node) => {
                        console.log("Node init")
                        return await node.start()
                            .then((node) => {
                                console.log("Node started")
                                console.log(node)
                                return node
                            })
                            .catch((err) => { 
                                console.log("error in node start", err) 
                                throw err
                            })
                    })
                    .catch((err) => { 
                        console.log("error in node init", err) 
                        throw err
                    })
            })
            .catch((err) => {
                console.log("erorr spawning node", err)
                throw err
            })
        return node
    }

    public async createIPFSNode(): Promise<IPFS.IPFS> {
        return await ipfsModule.create(this.nodes.length > 0 ? this.newConfig().config: this.currentConfig ).then((node) => {
            this.nodes.push(node)
            console.log("Node created, current number of nodes: ", this.nodes.length)
            return node
        })
    }

    private async createFactory() {
        return ipfsd.createFactory(
            {
                type: "go", // default type, can be overridden per spawn
                disposable: false,
                remote: false,
                test: false,
                ipfsHttpModule: ipfsHTTpModule,
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
}

export { IPFSNodeManager }

