import { isPortInUse } from "../common/utils.js";
import { ctx } from "../index.js";
import { getOrbitDB } from "../orbitdb/orbitdb.js";
import { UserRegistry } from "../registry.js";
import { IPFShareLog } from "../shareLog.js";
import { getAppConfigAndPromptIfUsernameInvalid } from "../common/appConfig.js";
import { logger } from "../common/logger.js";
import { newNodeConfig } from "./ipfsNodeConfigs.js";
import fs from "fs";
import * as goIPFSModule from "go-ipfs";
import * as Ctl from "ipfsd-ctl";
import * as KuboRPCModule from "kubo-rpc-client";
import net from "node:net";
import path from "node:path";
import psList from "ps-list";
class IPFSNodeManager {
    // mainNode!: Controller<ControllerType>
    factory;
    currentConfig;
    nodes = [];
    apiPort = 5002;
    swarmPort = 4002;
    gatewayPort = 8090;
    static getRepoPath() {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error("IPFSHARE_HOME is not defined");
        }
        return path.join(process.env.IPFSHARE_HOME, "ipfsRepo");
    }
    newConfig(type = "js") {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error("IPFSHARE_HOME is not defined");
        }
        const config = newNodeConfig(type, { apiPort: this.apiPort, swarmPort: this.swarmPort, gateawayPort: this.gatewayPort });
        const ipfsBaseOptions = {
            repo: IPFSNodeManager.getRepoPath(),
            config: config,
            init: {
                allowNew: true,
            }
        };
        this.swarmPort += 2;
        this.apiPort += 1;
        this.gatewayPort += 1;
        this.currentConfig = ipfsBaseOptions;
        return ipfsBaseOptions;
    }
    async createNode() {
        if (!this.factory) {
            this.factory = await this.createFactory();
        }
        const repoPath = IPFSNodeManager.getRepoPath();
        let nodeConfig = { repo: repoPath };
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath, { recursive: true });
            if (!fs.existsSync(repoPath)) {
                throw new Error("Could not create repo path");
            }
            logger.info("New repo crated");
            nodeConfig = this.newConfig("go");
        }
        logger.debug(`Spawning node, current number of nodes: ${this.factory.controllers.length}`);
        logger.debug(`Selected repo ${repoPath}`);
        const ipfs = await this.factory.spawn({ type: "go", ipfsOptions: nodeConfig, })
            .catch((err) => {
            logger.error("erorr spawning node", err);
            throw err;
        });
        await ipfs.init().catch((err) => {
            logger.error("error in node init", err);
            throw err;
        });
        return ipfs;
    }
    async createFactory() {
        return Ctl.createFactory({
            type: "go",
            disposable: false,
            test: false,
            remote: false,
            kuboRpcModule: KuboRPCModule,
            // ipfsHttpModule: ipfsHTTpModule,
        }, {
            go: {
                ipfsBin: goIPFSModule.path(),
            },
        });
    }
    static async isDaemonRunning() {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error("Setup was run but IPFShare home is not set");
        }
        const repoLockPath = path.join(process.env.IPFSHARE_HOME, "ipfsRepo", "repo.lock");
        const apiFilePath = path.join(process.env.IPFSHARE_HOME, "ipfsRepo", "api");
        try {
            // apiFilePath contains a line like this one: /ip4/127.0.0.1/tcp/5001
            const portMatch = fs.readFileSync(apiFilePath).toString().match(/(\d+)(?!.*\d)/); // port 
            if (portMatch === null)
                return false;
            const apiPort = parseInt(portMatch[0]);
            return fs.existsSync(repoLockPath) && await isPortInUse(apiPort);
        }
        catch (error) {
            return false;
        }
    }
    static createOrbitDBService() {
        const server = net.createServer(socket => {
            socket.on("data", data => {
                const message = data.toString();
                if (message === "pauseOrbitDB") {
                    (async () => {
                        logger.info("Pausing OrbitDB");
                        if (!ctx.orbitdb)
                            throw new Error("OrbitDB is not initialized");
                        await ctx.orbitdb.disconnect();
                        if (!process.env.IPFSHARE_HOME)
                            throw new Error("IPFShare home is not set");
                        ctx.identity?.provider.keystore.close();
                        socket.write("OrbitDB paused");
                    })();
                }
                else if (message === "resumeOrbitDB") {
                    (async () => {
                        logger.info("Resuming OrbitDB");
                        if (!ctx.ipfs)
                            throw new Error("IPFS is not initialized");
                        ctx.orbitdb = await getOrbitDB(true);
                        await ctx.identity?.provider.keystore.open();
                        ctx.registry = new UserRegistry(ctx.ipfs.api, ctx.orbitdb);
                        await ctx.registry.open();
                        logger.info("Replicating registry");
                        await ctx.registry.replicate();
                        ctx.shareLog = new IPFShareLog(ctx.ipfs.api, ctx.orbitdb, "ipfs-sharelog");
                        await ctx.shareLog.open();
                        await ctx.shareLog.onNewShare();
                    })();
                }
            });
            socket.on("error", err => {
                logger.error("Error in OrbitDB service", err);
                throw err;
            });
        });
        return server;
    }
    async startDaemon() {
        const service = IPFSNodeManager.createOrbitDBService();
        service.listen(3000, "localhost", () => {
            logger.info("OrbitDB service listening on port 3000");
        });
        let daemon = await this.createNode();
        daemon = await daemon.start()
            .catch((err) => {
            logger.error("Error launching daemon", err);
            process.exit(1);
        });
        daemon.subprocess?.stdout?.pipe(process.stdout);
        daemon.subprocess?.stderr?.pipe(process.stderr);
        daemon.subprocess?.setMaxListeners(Infinity);
        logger.debug(`IPFS Daemon started with pid ${daemon.subprocess?.pid}`);
        ctx.ipfs = daemon;
        ctx.orbitdb = await getOrbitDB(true);
        ctx.registry = new UserRegistry(ctx.ipfs.api, ctx.orbitdb);
        logger.info("Replicating registry");
        await ctx.registry.open();
        await ctx.registry.replicate();
        ctx.shareLog = new IPFShareLog(ctx.ipfs.api, ctx.orbitdb, "ipfs-sharelog");
        await ctx.shareLog.open();
        await ctx.shareLog.onNewShare();
        ctx.appConfig = await getAppConfigAndPromptIfUsernameInvalid(true);
        process.on("SIGINT", () => {
            (async () => {
                logger.info("Killing daemon");
                await daemon.stop();
                fs.rmSync(path.join(IPFSNodeManager.getRepoPath(), "api"), { force: true });
                await ctx.orbitdb?.disconnect();
                process.exit(0);
            })();
        });
        process.on("beforeExit", () => {
            (async () => {
                logger.info("Daemon exiting");
                await daemon.stop();
                fs.rmSync(path.join(IPFSNodeManager.getRepoPath(), "api"), { force: true });
                process.exit(0);
            })();
        });
    }
    static async stopDaemon() {
        // get the pid of the daemon
        const pid = await psList().then((list) => {
            const daemon = list.find((someProcess) => someProcess.name.includes("node_modules/go-ipfs/bin/ipfs"));
            if (daemon === undefined) {
                return undefined;
            }
            return daemon.pid;
        });
        if (pid === undefined) {
            console.error("Could not find daemon");
            return;
        }
        // kill the daemon
        process.kill(pid);
    }
}
export { IPFSNodeManager };
//# sourceMappingURL=IPFSNodeManager.js.map