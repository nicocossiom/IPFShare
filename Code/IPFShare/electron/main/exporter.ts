
let orbitdb: typeof import("orbit-db") // = {} as typeof import("orbit-db")
let ipfsHTTpModule: typeof import("ipfs-http-client") // = {} as typeof import("ipfs-http-client")
let ipfsModule: typeof import("ipfs") // = {} as typeof import("ipfs")
let goIpfsModule: any | undefined
let ipfsd: typeof import("ipfsd-ctl") // = {} as typeof import("ipfsd-ctl")
let Ceramic: typeof import("@ceramicnetwork/core") // = {} as typeof import("@ceramicnetwork/core")
let CeramicClient: typeof import("@ceramicnetwork/http-client") // = {} as typeof import("@ceramicnetwork/http-client") 
const ensureModulesLoaded = async () => {
    try { 
        goIpfsModule = require("go-ipfs")
        ipfsHTTpModule = await import("ipfs-http-client")
        ipfsModule = await import("ipfs")
        ipfsd = await import("ipfsd-ctl")
        orbitdb = await import("orbit-db")
        Ceramic = await import("@ceramicnetwork/core")
        CeramicClient = await import("@ceramicnetwork/http-client")
    } catch (e) {
        console.log("Ha habido un error en el exporter", e)
    }
    console.log("exporter.ts: all modules loaded")
}


export { ensureModulesLoaded, orbitdb, ipfsHTTpModule, ipfsModule, goIpfsModule, ipfsd, Ceramic, CeramicClient }

