import { ctx } from "@app/index.js"
import { daemonPromptIfNeeded, notSetupPrompt, setupPrompt } from "@app/setup.js"
import { Argument, Command, Option, OptionValues } from "@commander-js/extra-typings"
import { withContext } from "@common/utils.js"
import { IPFSNodeManager } from "@ipfs/IPFSNodeManager.js"
import { Share, addEncryptedObject, createEncryptedTarFromPaths, decryptAndExtractTarball, downloadFromIpfs, getEnctrypedObject, uploadToIpfs } from "@ipfs/ipfsUtils.js"
import chalk from "chalk"
import figlet from "figlet"
import fs from "fs"
import { CID } from "kubo-rpc-client"
import prompts from "prompts"
import { decryptTarballAndReadEntries } from "./ipfs/ipfsUtils.js"
chalk.level = 3
const logo = figlet.textSync("IPFShare", { font: "Georgia11", horizontalLayout: "default", verticalLayout: "default" })

const program = new Command()

program
    .version("0.0.1")
    .name("ipfshare")
    .addHelpText("before", `${chalk.yellow(logo)}`)
    .addHelpText("before", "An IPFS-based, encrypted file sharing CLI tool\n")
    .action(async () => {
    // default action (no arguments or options specified)
    // checks if the program is setup, if not, asks the user if they want to setup
    // after setup, the user is prompted to start the daemon
    // if the daemon is not running the user is prompted to start it
        await notSetupPrompt()
        await daemonPromptIfNeeded() // checks if the daemon is running, if not it will prompt the user to start it
        program.help()
    })


program.on("command:*", () => {
    console.error("Invalid command: %s\nSee --help for a list of available commands.", program.args.join(" "))
    process.exit(1)
})


// TODO add more description

program.command("setup")
    .summary("Run initial setup")
    .description(`Runs the initial setup:
    - Creates IPFShare home folder. This is where all files/folders program related are located
    - Generate the IPFS repository and config
    - Generates encryption keys
    - Etc.`
    )
    .argument("[path]", "Path to IPFShare home folder") // Square brackets around the argument make it optional
    .action(async (path) => {
        if (path) {
            return await setupPrompt(path)
        }
        await setupPrompt()
    })


const daemonCommand = program.command("daemon")
    .summary("Start the Kubo (go-ipfs) daemon. This is a custom daemon for IPFShare. See daemon --help for more info.")
    .description(`Starts the Kubo (go-ipfs) daemon. When no instances of the daemon are running, a new instance is spawned. Fails if an instance is already running.
        When first running the program after setup or resetup, the user is prompted to start the daemon. If no instances are running the user is prompted to start the dameon.`)
    .argument("<action>", "Action to perform. Can be 'start' or 'stop'.")

    // .option(`-s, --silent`, `Start the daemon silently. No output is shown.`)
    // .option(`-b, --background`, `Start the daemon in the background. This launches another process no output is shown.`)
    .action(async (arg) => {
        if (arg === "start") {
            const manager = new IPFSNodeManager()
            await manager.startDaemon()
        }
        if (arg === "stop") {
            IPFSNodeManager.stopDaemon()
        }
    })


type CommandOptions<T extends Command<unknown[], OptionValues>> = T extends Command<unknown[], infer O> ? O : never;
type CommandArguments<T extends Command<unknown[], OptionValues>> = T extends Command<infer A, OptionValues> ? A : never;
export type DaemonCommandOptions = CommandOptions<typeof daemonCommand>;

program.command("cat")
    .summary("Print the contents of a given CID")
    .description("Prints the contents of a given CID. The CID must be an encrypted jwt.")
    .argument("[cids...]", "CID of file or folder to cat")
    .action(async (cids: string[]) => {
    // if empty cid array
        if (!cids || cids.length === 0) {
            program.help()
        }
        await withContext(async () => {
            for (const strCid of cids) {
                const cid = CID.parse(strCid)
                const bufferMap = await getEnctrypedObject(cid)
                // const isBuffer = (bufferMap.entries().next().value[1] instanceof Buffer)
                // if (bufferMap.size !== 1 || !isBuffer) {
                //     console.log("The given CID corresponds to a folder. Use 'ipfshare ls' to show the contents of the folder.")
                //     process.exit(0)
                // }
                // for (const [key, value] of bufferMap.entries()) {
                //     console.log(`\n${key}\n`)
                //     console.log(value.toString())
                // }
            }
        })
    })

program.command("ls")
    .summary("List the contents of a given CID")
    .description("Lists the contents of a given CID. The CID must be an encrypted jwt.")
    .argument("[cids...]", "CID of file or folder to ls")
    .action(async (cids: string[]) => {
        // if empty cid array
        if (!cids || cids.length === 0) {
            program.help()
        }
        await withContext(async () => {
            for (const strCid of cids) {
                const cid = CID.parse(strCid)
                const {contentCID, iv, key} = await getEnctrypedObject(cid)
                const contentRes = await downloadFromIpfs(contentCID)
                await decryptTarballAndReadEntries(contentRes, Buffer.from(key, "utf-8"),  Buffer.from(iv, "utf-8"))
            }
        })
    })



const interactiveRegistryPrompt:  (promptMessage: string)  => Promise<string[]> = async (promptMessage) => {
    const users =  (await ctx.registry?.searchUsers(() => true))
    if (!users) throw new Error("No users found")
    const choices = users.filter(user => ctx.appConfig?.user.peerId !== user.peerId)
        .map((user) => {
            const res: prompts.Choice = {
                title: `${user.username} - ${user.orbitdbIdentity} - peerId: ${user.peerId}`,
                value: user.orbitdbIdentity,
            }
            return res
        })
    // using prompts package with autocompleteMultiselect
    const response = await prompts.prompt({
        type: "autocompleteMultiselect",
        name: "recipients",
        message: promptMessage,
        choices: choices,
        min: 0,
        max: users.length,
        hint: "- Space to de/select. Return to submit"
    })

    if (response.recipients) {
        return response.recipients
    } else {
        throw new Error("No recipients selected")
    }
}
const raise = (err: string): never => {
    throw new Error(err)
}

const messagePrompt: () => Promise<string> = async () => {
    const response = await prompts.prompt({
        type: "text",
        name: "message",
        message: "Message to send to recipients",
    })
    return response.message ?? raise("No message provided")
}

function getRecipientNames(recipients: string[]): string[] {
    if (!ctx.registry) throw new Error("Registry not initialized")
    const users = ctx.registry.store.query((reg) => {
        return recipients.includes(reg.orbitdbIdentity)
    })
    const recipientNames = users.map((user) => user.username)
    return recipientNames
}

program.command("share")
    .argument("[path...]", "Path to file or folder to upload")
    .action(async (paths) => {
        // if empty path array
        if (!paths || paths.length === 0) {
            program.help()
        }
        await withContext(async () => {
            if (!ctx.did) throw new Error("DID not initialized")
            
            const { encryptedStream, iv, key } = await createEncryptedTarFromPaths(paths)
            const res = await uploadToIpfs(encryptedStream)
            // let doneSelectingRecipients = false
            const recipients: string[] = await interactiveRegistryPrompt("Select recipients")
            recipients.push(ctx.appConfig!.user.orbitdbIdentity)
            console.log(`Recipient DIDs ${recipients}`)
            const share: Share = {
                contentCID: res.cid, 
                iv: iv.toString("base64"), 
                key: key.toString("base64"), 
                recipientDIDs: recipients
            }
            const msg = await messagePrompt()
            const recipientNames= getRecipientNames(share.recipientDIDs)
            const shareCID = await addEncryptedObject(share)
            const shareHash = await ctx.shareLog?.addShare(
                {
                    message: msg,
                    recipients: recipients,
                    shareCID: shareCID,
                    senderName: ctx.appConfig!.user.username,
                    recipientNames: recipientNames, 
                    senderId: ctx.appConfig!.user.orbitdbIdentity
                }
            ) 
            console.log(`Added share to ShareLog with hash: ${shareHash}`)
            console.log(`Content CID: ${res.cid.toString()}`)
            console.log(`Share CID: ${shareCID.toString()}`)
            // const ipnsRes = await createIPNSLink(shareCID, "prueba")
            // console.log(`IPNS Link: ${ipnsRes.name}, ${ipnsRes.value}`)
        })
    })

program.command("download")
    .summary("Print the contents of a given CID")
    .description("Prints the contents of a given CID. The CID must be an encrypted jwt.")
    .argument("[cids...]", "CID of file or folder to cat")
    .addOption(new Option("-o, --output <path>", "Output path"))
    .action(async (cids: string[], command) => {
    // if empty cid array
        if (!cids || cids.length === 0) {
            console.log("No cids provided")
            program.help()
            process.exit(1)
        }
        if (command.output == null || command.output === undefined || command.output === "") {
            console.log("No output path provided")
            program.help()
            process.exit(1)
        }
        const outPath = command.output
        fs.mkdirSync(outPath, { recursive: true })
        await withContext(async () => {
            for (const strCid of cids) {
                const cid = CID.parse(strCid) 
                const share = await getEnctrypedObject(cid)
                console.log(share)
                const {contentCID, iv, key} = share
                // console.log(`Content CID: ${contentCID.toString()}`)
                // console.log(`IV: ${iv}`)
                // console.log(`Key: ${key}`)
                const contentRes = await downloadFromIpfs(contentCID)
                const contentStats = await ctx.ipfs!.api.files.stat("/ipfs/" + contentCID.toString())
                await decryptAndExtractTarball(contentRes, Buffer.from(key, "base64"), Buffer.from(iv, "base64"), outPath,contentStats.size)
            }
        })
    })


const registryUpdateCommand = new Command("update")
    .summary("Update username if available")
    .addArgument(new Argument("<username>", "Username to update to"))
    .action(async (username) => {
        await withContext(async () => {
            if(!ctx.appConfig) throw new Error("AppConfig not initialized")
            const userPartial = { username: username }
            if (!ctx.appConfig.user.username) throw new Error("Username is not set")
            await ctx.registry?.updateUser(ctx.appConfig.user.orbitdbIdentity, userPartial)
        })
    })

const registryDeleteCommand = new Command("delete")
    .summary("Delete your IPFShare account")
    .description("Deletes the entry in the registry associated with your account. \
    This means that other users will not be able to share files with you as your DID information is not available.")
    .action(async () => { 
        await withContext(async () => {
            if(!ctx.appConfig) throw new Error("AppConfig not initialized")
            await ctx.registry?.deleteUser(ctx.appConfig.user.orbitdbIdentity)
        })
    })

const registryListCommand = new Command("list")
    .summary("List all users in the IPFShare global registry")
    .action(async () => {
        await withContext(async () => {
            const users = ctx.registry?.store.query(() => true)
            console.log(users)
        })
    })

const registrySearchCommand = new Command("search")
    .summary("Search for a user in the IPFShare global registry")
    .description("Search for a user in the IPFShare global registry by username, orbitDB identity or peerId")
    // add three optionas for username, orbitdb identity and peerId, each recieves an argument
    .addOption(new Option("-i, --interactive", "Downloads the registry and shows an interactive prompt to search for a user"))
    .addOption(new Option("-u, --username <username>", "Search by username"))
    .addOption(new Option("-o, --orbitdb <orbitdbIdentity>", "Search by orbitdb identity"))
    .addOption(new Option("-p, --peerId <peerId>", "Search by peerId"))
    .action(async(options) => {
        await withContext(async () => {
            if (options.interactive) {
                await interactiveRegistryPrompt("Search for a user by username, orbitdb identity or peerId")
                return
            }
            console.log(await ctx.registry?.searchUsers(
                (user) => {
                    return user.username === options.username
                        || user.orbitdbIdentity === options.orbitdb
                        || user.peerId === options.peerId

                }))
        })
    })

const shareLogListCommand = new Command("list")
    .summary("List all shares in the global share log")
    .action(async () => {
        await withContext(async () => {
            ctx.shareLog?.store.iterator({ limit: -1 }).collect().forEach((entry) => {
                console.log(entry.hash)
                console.log(entry.payload.value)
            })
        })
    })
const shareLogCommand = program.command("sharelog")
    .summary("Interact with the global share log")
    .addCommand(shareLogListCommand)

const sharedListCommand = new Command("list")
    .summary("List all shares shared with you")
    .action(async () => { 
        await withContext(async () => { 
            ctx.shareLog?.localSharedWithMeStore.iterator({ limit: -1 }).collect().forEach((entry) => {
                console.log(entry.hash)
                console.log(entry.payload.value)
            })
        })
    })
const sharedComomand = program.command("shared")
    .summary("List all files and folders shared with you")
    .description("List all files and folders shared with you by other users. You can select ")
    .addCommand(sharedListCommand)


const sharesListComomand = new Command("list")
    .summary("List all files and folders that you are sharing with other users")
    .description("Lists all names of shares identified by their share name which is an key associated to IPNS links")
    .action(async () => { 
        await withContext(async () => { 
            ctx.shareLog?.localSharedWithOthersStore.iterator({ limit: -1 }).collect().forEach((entry) => {
                console.log(entry.hash)
                console.log(entry.payload.value)
            })
        })
    })


const sharesCommand = program.command("shares")
    .summary("Interact with shares created by you")
    .description("Interact with shares created by you. You can create, list, update and delete shares.")
    .addCommand(sharesListComomand)
    .action(async (opts, command) => { 
        if(command.args.length === 0) { 
            command.help()
            return
        }
    })

const registryRegisterCommand = new Command("register")
    .summary("Register yourself in IPFShare global registry")
    .description("This is done automatically when using the application, if this IPFShare\
     instance does not have a 'username' field in the config file the application will prompt you to register.")
    .action(async () => {
        await withContext(async () => {
            console.log("Registering user")
        })
    })

const registruCommand = program.command("registry")
    .summary("Access the IPFShare global registry. Change username or delete account.")
    .description("Update and query the IPFShare global registry")
    .addCommand(registryUpdateCommand)
    .addCommand(registryDeleteCommand)
    .addCommand(registryListCommand)
    .addCommand(registryRegisterCommand)
    .addCommand(registrySearchCommand)
    .action(async (opts, command) => {
        if (command.args.length === 0) {
            command.help()
            return
        }
    })

export type FriendsCommandArguments = CommandArguments<typeof registruCommand>
export type FriendsCommandOpions = CommandOptions<typeof registruCommand>

program.command("info")
    .summary("Provides information about the running ipfshare instance such as DID and peerID")
    .action(async () => {
        await withContext(
            async () => {
                console.log(`DID: ${ctx.identity?.toJSON().id}}`)
                console.log(`PeerID: ${ctx.ipfs?.peer.id}`)
                console.log(`OrbitDB identity: ${ctx.orbitdb?.id}`)
                console.log(`Registry Address: ${ctx.registry?.store.address.toString()}`)
            })
    })
       

export { program }

