/// <reference types="node" resolution-mode="require"/>
import { CID } from 'ipfs-http-client';
export type Directory = {
    files?: Map<string, Buffer>;
    directories?: Map<string, Directory>;
};
export type Shareable = Map<string, Directory | Buffer>;
export declare function traverseShareable(shareable: Shareable, indent?: string): void;
export declare class DagOperator {
    static addEncryptedObject(cleartext: Shareable, dids: string[]): Promise<void>;
    static getEnctrypedObject(cid: CID): Promise<Shareable>;
}
