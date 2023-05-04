// import { initialSetup } from '@app/setup.js'
import { program } from '@app/cli.js'

// const node = await initialSetup()
// await program.parseAsync(process.argv)
program.parse(process.argv)
// console.log(node)