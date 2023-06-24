import { logger } from '../common/logger.js';
import { ctx } from '../index.js';
export function traverseShareable(shareable, indent = ``) {
    const entries = [];
    for (const [key, value] of shareable.entries()) {
        if (value instanceof Buffer) {
            entries.push(key);
        }
        else {
            entries.push({ [key]: traverseDirectory(value) });
        }
    }
}
function traverseDirectory(directory) {
    const entries = [];
    if (directory.files) {
        const files = new Map(Object.entries(directory.files));
        for (const [fileName, _buffer] of files.entries()) {
            entries.push(fileName);
        }
    }
    if (directory.directories) {
        for (const [dirKey, dirValue] of directory.directories.entries()) {
            entries.push({ [dirKey]: traverseDirectory(dirValue) });
        }
    }
    return entries;
}
export class DagOperator {
    static async addEncryptedObject(cleartext, dids) {
        if (!ctx.did)
            throw new Error(`DID not initialized`);
        if (!ctx.ipfs?.api)
            throw new Error(`IPFS not initialized`);
        const jwe = await ctx.did.createDagJWE(cleartext, dids);
        logger.debug(`JWE: ${JSON.stringify(jwe)}`);
        const dagCID = await ctx.ipfs.api.dag.put(jwe, { storeCodec: `dag-jose`, hashAlg: `sha2-256` });
        console.log(`DAG CID: ${dagCID}`);
    }
    static async getEnctrypedObject(cid) {
        if (!ctx.did)
            throw new Error(`DID not initialized`);
        if (!ctx.ipfs)
            throw new Error(`IPFS not initialized`);
        const jwe = (await ctx.ipfs.api.dag.get(cid)).value;
        const shareable = await ctx.did?.decryptDagJWE(jwe);
        const shareableMap = new Map(Object.entries(shareable));
        return shareableMap;
    }
}
//# sourceMappingURL=dagOperations.js.map