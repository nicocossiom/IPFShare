import { ctx } from './index.js';
import OrbitDB from "orbit-db";
export async function getOrbitDB() {
    if (ctx.orbitdb)
        return ctx.orbitdb;
    if (!ctx.manager)
        throw new Error(`IPFS Node Manager not initialized`);
    if (!ctx.manager.factory?.controllers[0])
        throw new Error(`IPFS Node not initialized`);
    const ipfs = ctx.manager.factory?.controllers[0];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - OrbitDB should be able to use the IPFS api instance provided by the ipfsd-ctl controller but it doesn't since it extends the base IPFS api class 
    const orbit = await OrbitDB.createInstance(ipfs.api, {
        directory: ipfs.opts.ipfsOptions?.repo,
    });
    return orbit;
}
//# sourceMappingURL=orbitdb.js.map