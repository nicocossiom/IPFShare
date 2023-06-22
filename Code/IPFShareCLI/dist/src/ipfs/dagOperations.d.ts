/// <reference types="node" resolution-mode="require"/>
import { DID } from 'dids';
import { CID } from 'ipfs-http-client';
export declare class DagOperator {
    did: DID;
    create(): Promise<this>;
    createDidAndAuth(): Promise<DID>;
    addEncryptedObject(cleartext: Record<string, Buffer>, dids: string[]): Promise<any>;
    getEnctrypedObject(cid: CID): Promise<Record<string, any>>;
}
