import { app } from "electron"
import type { Controller, ControllerType, Factory, IPFSOptions } from "ipfsd-ctl"

export class IPFSNodeManager {
    mainNode!: Controller<ControllerType>
    private factory: Factory<ControllerType> | undefined
    // constructor
    constructor() {
        return (async (): Promise<IPFSNodeManager> => {
            this.factory = await this.createFactory()
            this.mainNode = await this.factory.spawn({type: "go"} )
            return this
        })() as unknown as IPFSNodeManager
        
    }

    private ifpsNodeOptions: IPFSOptions = {
        repo: app.getPath("appData"),
        config: {
            Pubsub: {
                Enabled: true,
            }

        },
        EXPERIMENTAL: {
            ipnsPubsub: true, 

        }, 
    }


    private async createFactory () {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
        const goIpfsModule = require("go-ipfs")
        const ipfsHTTpModule = await import("ipfs-http-client")
        const ipfsModule = await import("ipfs")
        const Ctl = await import("ipfsd-ctl")
        return Ctl.createFactory(
            {
                type: "go", // default type, can be overridden per spawn
                disposable: false,
                remote: false,
                test: false, 
                ipfsOptions: this.ifpsNodeOptions,
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
