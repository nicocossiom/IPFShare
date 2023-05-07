import { program } from "@app/cli.js"
import { AppContext } from "@app/types/types.js"
export const ctx: AppContext = { manager: undefined, orbitdb: undefined, ipfs: undefined} 
program.parseAsync(process.argv)
