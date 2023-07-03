import { ctx } from "@app/index.js"
import { RegistryEntry } from "@app/registry.js"
import { usernamePrompt } from "@app/setup.js"
import fs from "fs"
import path from "path"
export type AppConfig = {
    user: RegistryEntry
}


function getConfigPath() {
    if (!process.env.IPFSHARE_HOME) throw new Error("IPFSHARE_HOME is not defined")
    const configPath = path.join(process.env.IPFSHARE_HOME, "config.json")
    return configPath
}

function createConfig() {
    const configPath = getConfigPath()
    if (!ctx.ipfs) throw new Error("IPFS node is not initialized")
    if (!ctx.orbitdb) throw new Error("OrbitDB is not initialized")
    const user: RegistryEntry = {
        username: "",
        orbitdbIdentity: ctx.orbitdb.id, 
        peerId: ctx.ipfs.peer.id.toString()
    }
    const config: AppConfig = {
        user: user
    }
    fs.writeFileSync(configPath, JSON.stringify({ user: user }))
    return config
}

export async function getAppConfig(daemon = false) {
    const configPath = getConfigPath()
    if (!fs.existsSync(configPath)) {
        return createConfig()
    }
    const config: AppConfig = JSON.parse(fs.readFileSync(configPath).toString()) as AppConfig
    if (!config.user.username || config.user.username.length === 0) {
        console.log("Username is not set")
        if (!daemon) {
            const validateFn = async (username: string) => {
                const userInregistry = await ctx.registry?.getUser(username)
                if (userInregistry) {
                    console.log("Username already exists")
                    return false
                }
                console.log(`Username ${username} is valid`)
                return true
            }
            const username = await usernamePrompt(validateFn)
            console.log(`Setting username to ${username}`)
            config.user.username = username
            await ctx.registry?.addUser(config.user)
            fs.writeFileSync(configPath, JSON.stringify(config))
            if (!config.user.username) throw new Error("Username is not set and should have been set")
        } 
    }
    if (!ctx.registry) throw new Error("Registry is not initialized")
    const user = await ctx.registry.getUser(config.user.orbitdbIdentity)
    if (!user) throw new Error("User is not found in the registry")
    console.log(`Current user: ${JSON.stringify(user, null, 2)})`) 
    return config
}

export async function ensureAppConfig() {
    const config = await getAppConfig()
    let changes = false
    if (!config.user.peerId || config.user.peerId.length === 0) {
        if (!ctx.ipfs) throw new Error("IPFS node is not initialized")
        config.user.peerId = ctx.ipfs?.peer.id.toString()
        changes = true
    }
    if (!config.user.orbitdbIdentity || config.user.orbitdbIdentity.length === 0) {
        if (!ctx.orbitdb) throw new Error("OrbitDB is not initialized")
        config.user.orbitdbIdentity = ctx.orbitdb?.id
        changes = true
    }
    if (changes) {
        // update the config file
        const configPath = getConfigPath()
        fs.writeFileSync(configPath, JSON.stringify(config))
    }
    return config
}