import { app } from "electron"
import type { Controller, ControllerType, Factory, IPFSOptions } from "ipfsd-ctl"
import { goIpfsModule, ipfsHTTpModule, ipfsModule, ipfsd } from "../main/exporter"

class IPFSNodeManager {
    // mainNode!: Controller<ControllerType>
    factory: Factory<ControllerType> = {} as Factory<ControllerType>
    // constructor
    constructor() {
        return (async (): Promise<IPFSNodeManager> => {
            this.factory = await this.createFactory()
            return this
        })() as unknown as IPFSNodeManager
        
    }
    private ipfsBaseOptions: IPFSOptions = {
        
        repo: app.getPath("appData"),

        config: {
            Bootstrap: [
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
                "/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
                "/ip4/104.131.131.82/udp/4001/quic/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ"  
            ],
            Addresses: {
                Swarm: [
                    "/ip4/0.0.0.0/tcp/4001",
                    "/ip4/0.0.0.0/udp/4001/quic",
                    "/ip6/::/tcp/4001",
                    "/ip6/::/udp/4001/quic",
                ],
                API: "/ip4/127.0.0.1/tcp/5001",
                Gateway: "/ip4/127.0.0.1/tcp/8080",
                RPC: "/ip4/127.0.0.1/tcp/5003"
            },
            Pubsub: {
                Enabled: true,
                Router: "gossipsub",
            }, 
            Swarm: {
                RelayClient: {
                    Enabled: true,
                },
                // EnableRelayHop: true,
            }, 
            Discovery: {
                MDNS: {
                    Enabled: true,
                    Interval: 10
                }, 
                // WebRTCStart: {
                //     Enabled: true,
                // }, 
            },
        },
        EXPERIMENTAL: {
            ipnsPubsub: true, 
        }, 

    }

    public async createNode() : Promise<Controller<ControllerType>>{
        console.log(`Spawning node, current number of nodes: ${this.factory.controllers.length}`)
        if (this.factory.controllers.length > 0) {
            const newOptions = { ...this.ipfsBaseOptions }
            newOptions.repo = this.ipfsBaseOptions.repo + this.factory.controllers.length
            return await this.factory.spawn(
                {
                    type: "go",
                    ipfsOptions:  newOptions
                }
            )
        }
        console.log("Spawning first node")
        return this.factory.spawn({type: "go"} )
    }

    

    private async createFactory() {
        return ipfsd.createFactory(
            {
                type: "go", // default type, can be overridden per spawn
                disposable: false,
                remote: false,
                test: false,
                ipfsOptions: this.ipfsBaseOptions,
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
