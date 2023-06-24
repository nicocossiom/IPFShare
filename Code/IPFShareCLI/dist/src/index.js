import { program } from "./cli.js";
export const ctx = {
    manager: undefined,
    orbitdb: undefined,
    dbAddress: undefined,
    ipfs: undefined,
    identity: undefined,
    did: undefined
};
await program.parseAsync(process.argv).catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map