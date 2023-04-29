
let wn: typeof import("webnative") // = {} as typeof import("webnative")
let orbitdb : typeof import("orbit-db") // = {} as typeof import("orbit-db")
let ipfsHTTpModule: typeof import("ipfs-http-client") // = {} as typeof import("ipfs-http-client")
let ipfsModule: typeof import("ipfs") // = {} as typeof import("ipfs")
let goIpfsModule: any | undefined
let ipfsd: typeof import("ipfsd-ctl") // = {} as typeof import("ipfsd-ctl")
// (async () => {
//     try { 
//         wn = await import("webnative")
//         goIpfsModule = require("go-ipfs")
//         ipfsHTTpModule = await import("ipfs-http-client")
//         ipfsModule = await import("ipfs")
//         ipfsd = await import("ipfsd-ctl")
//         orbitdb = await import("orbit-db")
//         console.log("exporter.ts: all modules loaded")
//     } catch (e) {
//         console.log("Ha habido un error en el exporter", e)
//     }
// })()

const ensureModulesLoaded = async () => {
    try { 
        wn = await import("webnative")
        goIpfsModule = require("go-ipfs")
        ipfsHTTpModule = await import("ipfs-http-client")
        ipfsModule = await import("ipfs")
        ipfsd = await import("ipfsd-ctl")
        orbitdb = await import("orbit-db")
    } catch (e) {
        console.log("Ha habido un error en el exporter", e)
    }
    console.log("exporter.ts: all modules loaded")
}


export { ensureModulesLoaded, wn, orbitdb, ipfsHTTpModule, ipfsModule, goIpfsModule, ipfsd }

