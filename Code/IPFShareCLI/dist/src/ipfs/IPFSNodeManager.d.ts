import { IPFS } from 'ipfs';
import type { Controller, ControllerType, Factory } from 'ipfsd-ctl';
declare class IPFSNodeManager {
    factory: Factory<ControllerType> | undefined;
    private currentConfig;
    private nodes;
    private apiPort;
    private swarmPort;
    private gatewayPort;
    private newConfig;
    createNode(): Promise<Controller<ControllerType>>;
    createIPFSNode(): Promise<IPFS>;
    private createFactory;
}
export { IPFSNodeManager };
