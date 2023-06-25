import { program } from "@app/cli.js"
import { AppContext } from "@app/types/types.js"
import 'dotenv/config'
export const ctx: AppContext = {
    manager: undefined,
    orbitdb: undefined,
    dbAddress: undefined, 
    ipfs: undefined,
    identity: undefined,
    did: undefined,
    daemonSocket: undefined
} 
await program.parseAsync(process.argv).catch((e) => {
    console.error(e)
    process.exit(1)
})

