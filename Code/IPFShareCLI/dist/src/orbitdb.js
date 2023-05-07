import { ctx } from './index.js';
import OrbitDB from "orbit-db";
export async function getOrbitDB() {
    if (ctx.orbitdb)
        return ctx.orbitdb;
    if (!ctx.manager)
        throw new Error(`IPFS Node Manager not initialized`);
    // const ipfs = create({ url: `http://localhost:5002` })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - OrbitDB should be able to use the IPFS api instance provided by the ipfsd-ctl controller but it doesn't since it extends the base IPFS api class 
    const orbit = await OrbitDB.createInstance(ctx.ipfs.api, {
        directory: process.env.IPFSHARE_HOME,
    });
    return orbit;
}
//# sourceMappingURL=orbitdb.js.map