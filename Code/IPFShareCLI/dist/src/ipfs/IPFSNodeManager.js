// import { mdns } from '@libp2p/mdns'
// import { tcp } from '@libp2p/tcp'
// import { DaemonCommandOptions } from '../cli.js'
import { isPortInUse } from '../common/utils.js';
import { logger } from '../common/logger.js';
import { newNodeConfig } from './ipfsNodeConfigs.js';
import fs from 'fs';
import * as goIPFSModule from 'go-ipfs';
import * as ipfsModule from 'ipfs';
import * as ipfsHTTpModule from 'ipfs-http-client';
import * as Ctl from 'ipfsd-ctl';
import path from 'node:path';
import psList from 'ps-list';
// function libp2pConfig() {
//     /** @type { */
//     const options: Libp2pOptions = {
//         transports: [
//             tcp()
//         ],
//         peerDiscovery: [
//             mdns()
//         ],
//         connectionManager: {
//             maxParallelDials: 150, // 150 total parallel multiaddr dials
//             maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
//             dialTimeout: 10e3, // 10 second dial timeout per peer dial
//             autoDial: true
//         },
//         nat: {
//             enabled: true,
//             description: `ipfs@${os.hostname()}`
//         }
//     }
//     return options
// }
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
            throw new Error(`IPFSHARE_HOME is not defined`);
        }
        return path.join(process.env.IPFSHARE_HOME, `ipfsRepo`);
    }
    getReposPath(type = `go`) {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error(`IPFSHARE_HOME is not defined`);
        }
        let goIPFSRepo = path.join(process.env.IPFSHARE_HOME, `goRepos`);
        goIPFSRepo = this.factory ?
            path.join(goIPFSRepo, this.factory.controllers.length.toString()) :
            path.join(goIPFSRepo, `0`);
        const repo = type === `js` ?
            path.join(process.env.IPFSHARE_HOME, `jsRepos`, this.nodes.length.toString())
            : goIPFSRepo;
        return repo;
    }
    newConfig(type = `js`) {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error(`IPFSHARE_HOME is not defined`);
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
        const initializing = !fs.existsSync(repoPath);
        if (initializing) {
            fs.mkdirSync(repoPath);
            if (!fs.existsSync(repoPath)) {
                throw new Error(`Could not create repo path`);
            }
            logger.info(`New repo crated`);
            nodeConfig = this.newConfig(`go`);
        }
        logger.debug(`Spawning node, current number of nodes: ${this.factory.controllers.length}`);
        logger.debug(`Selected repo ${repoPath}`);
        const ipfs = await this.factory.spawn({ type: `go`, ipfsOptions: nodeConfig })
            .catch((err) => {
            logger.error(`erorr spawning node`, err);
            throw err;
        });
        await ipfs.init().catch((err) => {
            logger.error(`error in node init`, err);
            throw err;
        });
        return ipfs;
    }
    async createIPFSNode() {
        return await ipfsModule.create(this.nodes.length > 0 ? this.newConfig().config : this.currentConfig).then((node) => {
            this.nodes.push(node);
            logger.debug(`Node created, current number of nodes: `, this.nodes.length);
            return node;
        });
    }
    async createFactory() {
        return Ctl.createFactory({
            type: `js`,
            disposable: false,
            test: false,
            remote: false,
            ipfsHttpModule: ipfsHTTpModule,
            ipfsModule: ipfsModule, // only if you gonna spawn 'proc' controllers
        }, {
            // overrides per type
            js: {
                ipfsBin: ipfsModule.path(),
            },
            go: {
                ipfsBin: goIPFSModule.path(),
            },
        });
    }
    static async isDaemonRunning() {
        if (process.env.IPFSHARE_HOME === undefined) {
            throw new Error(`Setup was run but IPFShare home is not set`);
        }
        const repoLockPath = path.join(process.env.IPFSHARE_HOME, `ipfsRepo`, `repo.lock`);
        const apiFilePath = path.join(process.env.IPFSHARE_HOME, `ipfsRepo`, `api`);
        try {
            // apiFilePath contains a line like this one: /ip4/127.0.0.1/tcp/5001
            const portMatch = fs.readFileSync(apiFilePath).toString().match(/(\d+)(?!.*\d)/); // port 
            if (portMatch === null)
                return false;
            const apiPort = parseInt(portMatch[0]);
            fs.existsSync(repoLockPath) && await isPortInUse(apiPort);
        }
        catch (error) {
            return false;
        }
        return true;
    }
    async startDaemon() {
        const daemon = await this.createNode();
        await daemon.start()
            .catch((err) => {
            logger.error(`error in node start`, err);
            throw err;
        });
        daemon.subprocess?.setMaxListeners(Infinity);
        logger.info(`set max listeners to infinity, current max listeners: ${daemon.subprocess?.getMaxListeners()}`);
        //restore stdout and stderr to this process stdout and stderr
        daemon.subprocess?.stdout?.on(`data`, (data) => {
            console.log(data.toString());
        });
        daemon.subprocess?.stderr?.on(`data`, (data) => {
            console.log(data.toString());
        });
        logger.debug(`IPFS Daemon started with pid ${daemon.subprocess?.pid}`);
        // get the daemon.subprocess stdout and stderr
        // make the subprocess stdout and stderr available to the main process
        process.on(`SIGINT`, async () => {
            logger.info(`Killing daemon`);
            await daemon.stop();
            fs.rmSync(path.join(IPFSNodeManager.getRepoPath(), `api`), { force: true });
            process.exit(0);
        });
    }
    static async stopDaemon() {
        // get the pid of the daemon
        const pid = await psList().then((list) => {
            const daemon = list.find((someProcess) => someProcess.name.includes(`node_modules/go-ipfs/bin/ipfs`));
            if (daemon === undefined)
                throw new Error(`Daemon not found`);
            return daemon.pid;
        });
        // kill the daemon
        process.kill(pid);
    }
}
export { IPFSNodeManager };
//# sourceMappingURL=IPFSNodeManager.js.map