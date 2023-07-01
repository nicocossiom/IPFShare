import { AppContext } from "@app/types/types.js"
import { myTar } from "@ipfs/dagOperations.js"
import "dotenv/config"
export const ctx: AppContext = {
    manager: undefined,
    orbitdb: undefined,
    dbAddress: undefined, 
    ipfs: undefined,
    identity: undefined,
    did: undefined,
    daemonSocket: undefined
} 
// await program.parseAsync(process.argv).catch((e) => {
//     console.error(e)
//     process.exit(1)
// })


await myTar(["/Users/pepperonico/Downloads"])