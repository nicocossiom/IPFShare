import type { ControllerType, Factory } from "ipfsd-ctl";
import * as Ctl from "ipfsd-ctl";
declare class IPFSNodeManager {
    factory: Factory<ControllerType> | undefined;
    private currentConfig;
    private nodes;
    private apiPort;
    private swarmPort;
    private gatewayPort;
    private static getRepoPath;
    private newConfig;
    createNode(): Promise<Ctl.Controller<ControllerType>>;
    private createFactory;
    static isDaemonRunning(): Promise<boolean>;
    private static createOrbitDBService;
    startDaemon(): Promise<void>;
    static stopDaemon(): Promise<void>;
}
export { IPFSNodeManager };
