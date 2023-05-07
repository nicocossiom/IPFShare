import { IPFS } from 'ipfs';
import type { ControllerType, Factory } from 'ipfsd-ctl';
import * as Ctl from 'ipfsd-ctl';
declare class IPFSNodeManager {
    factory: Factory<ControllerType> | undefined;
    private currentConfig;
    private nodes;
    private apiPort;
    private swarmPort;
    private gatewayPort;
    private static getRepoPath;
    private getReposPath;
    private newConfig;
    createNode(): Promise<Ctl.Controller<ControllerType>>;
    createIPFSNode(): Promise<IPFS>;
    private createFactory;
    static isDaemonRunning(): Promise<boolean>;
    startDaemon(): Promise<void>;
    static stopDaemon(): Promise<void>;
}
export { IPFSNodeManager };
