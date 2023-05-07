import { program } from "@app/cli.js"
import { AppContext } from "@app/types/types.js"
export const ctx: AppContext = { manager: undefined, orbitdb: undefined} 
await program.parseAsync(process.argv)
