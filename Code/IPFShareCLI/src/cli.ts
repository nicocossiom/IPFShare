import { daemonPromptIfNeeded, notSetupPrompt, setupPrompt } from '@app/setup.js'
import { Command, Option, OptionValues } from '@commander-js/extra-typings'
import { IPFSNodeManager } from '@ipfs/IPFSNodeManager.js'
import chalk from 'chalk'
import figlet from 'figlet'
import { addKnownPeer, listFriends, removeKnownPeer } from './friends.js'
chalk.level = 3


const logo = figlet.textSync(`IPFShare`, { font: `Georgia11`, horizontalLayout: `default`, verticalLayout: `default` })

const program = new Command()

program
    .version(`0.0.1`)
    .name(`ipfshare`)
    .addHelpText(`before`, `${chalk.yellow(logo)}`)
    .addHelpText(`before`, `An IPFS-based, encrypted file sharing CLI tool\n`)
    .action(async () => { 
        // default action (no arguments or options specified)
        // checks if the program is setup, if not, asks the user if they want to setup
        // after setup, the user is prompted to start the daemon
        // if the daemon is not running the user is prompted to start it
        await notSetupPrompt()
        await daemonPromptIfNeeded() // checks if the daemon is running, if not it will prompt the user to start it
        program.help()
    })

// TODO add more description

const setupCommand = program.command(`setup`)
    .summary(`Run initial setup`)
    .description(`Runs the initial setup: 
    - Creates IPFShare home folder. This is where all files/folders program related are located
    - Generate the IPFS repository and config
    - Generates encryption keys
    - Etc.`
    )
    .argument(`[path]`, `Path to IPFShare home folder`, `~/.ipfshare`) // Square brackets around the argument make it optional
    .action( (path: string) => {
        setupPrompt(path)
    })

const daemonCommand = program.command(`daemon`)
    .summary(`Start the Kubo (go-ipfs) daemon. This is a custom daemon for IPFShare. See daemon --help for more info.`)
    .description(`Starts the Kubo (go-ipfs) daemon. When no instances of the daemon are running, a new instance is spawned. Fails if an instance is already running.
        When first running the program after setup or resetup, the user is prompted to start the daemon. If no instances are running the user is prompted to start the dameon.`)
    // .option(`-s, --silent`, `Start the daemon silently. No output is shown.`)
    // .option(`-b, --background`, `Start the daemon in the background. This launches another process no output is shown.`)
    .action(async (options) => {
        const manager = new IPFSNodeManager()
        await manager.startDaemon()
    })


type CommandOptions<T extends Command<unknown[], OptionValues>> = T extends Command<unknown[], infer O> ? O : never;
type CommandArguments<T extends Command<unknown[], OptionValues>> = T extends Command<infer A, OptionValues> ? A : never;
export type DaemonCommandOptions = CommandOptions<typeof daemonCommand>;


const friendsCommand = program.command(`friends`)
    .summary(`Manage friends`)
    .description(`Manage friends. Friends are other IPFShare users that you have added. You can add, remove, and list friends.`)
    .addOption(new Option(`-a, --add <friend...>`, `Add friends`))
    .addOption(new Option(`-rm, --remove <friends...>`, `Remove friends`))
    .addOption(new Option(`-l, --list`, `List friends`))
    .action(async (options, command) => {        
        // if empty options object 
        if (!options || Object.keys(options).length === 0) {
            command.help()
        }
        if (options.add) return addKnownPeer(options.add)
        if (options.remove) return await removeKnownPeer(options.remove)
        if (options.list) return await listFriends()
    })

export type FriendsCommandArguments = CommandArguments<typeof friendsCommand>


export { program }
