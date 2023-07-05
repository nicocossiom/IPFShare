import { program } from "./cli.js";
export const ctx = {
    manager: undefined,
    orbitdb: undefined,
    dbAddress: undefined,
    ipfs: undefined,
    identity: undefined,
    did: undefined,
    daemonSocket: undefined,
    registry: undefined,
    appConfig: undefined,
    shareLog: undefined
};
await program.parseAsync(process.argv);
//# sourceMappingURL=index.js.map