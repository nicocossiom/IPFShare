import { IPFS } from 'ipfs';
import type { Controller, ControllerType, Factory } from 'ipfsd-ctl';
declare class IPFSNodeManager {
    factory: Factory<ControllerType> | undefined;
    private currentConfig;
    private nodes;
    private apiPort;
    private swarmPort;
    private gatewayPort;
    private getRepoPath;
    private getReposPath;
    private newConfig;
    private isSpawnedDaemonDead;
    createNode(): Promise<Controller<ControllerType>>;
    private stopListeningDaemon;
    createIPFSNode(): Promise<IPFS>;
    private createFactory;
    static isDaemonRunning(): Promise<boolean>;
    static startDaemon(): Promise<void>;
    static stopDaemon(): Promise<void>;
}
export { IPFSNodeManager };
