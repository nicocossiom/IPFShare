import { program } from "@app/cli.js"
import { AppContext } from "@app/types/types.js"
export const ctx: AppContext = {
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
} 

await program.parseAsync(process.argv)