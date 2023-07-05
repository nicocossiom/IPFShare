/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { CID } from "kubo-rpc-client";
import { AddResult, NameAPI } from "kubo-rpc-client/dist/src/types";
import { PassThrough } from "stream";
export type Share = {
    contentCID: CID;
    key: string;
    iv: string;
    recipientDIDs: string[];
};
export declare function addEncryptedObject(share: Share): Promise<CID>;
export declare function getEnctrypedObject(cid: CID): Promise<Share>;
export declare function downloadFromIpfs(cid: CID): Promise<NodeJS.ReadableStream>;
export declare function uploadToIpfs(stream: PassThrough): Promise<AddResult>;
export type PublishResult = Awaited<ReturnType<NameAPI["publish"]>>;
export declare function createIPNSLink(cid: CID, shareName: string): Promise<PublishResult>;
export declare function createEncryptedTarFromPaths(pathsToInclude: string[], tarPath?: string): Promise<{
    encryptedStream: PassThrough;
    iv: Buffer;
    key: Buffer;
}>;
export declare function decryptAndExtractTarball(encryptedStream: NodeJS.ReadableStream, key: Buffer, iv: Buffer, outputPath: string, totalSize: number): Promise<void>;
export declare function decryptTarballAndReadEntries(encryptedStream: NodeJS.ReadableStream, key: Buffer, iv: Buffer): Promise<string[]>;
