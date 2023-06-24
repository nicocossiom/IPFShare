import { Shareable } from '../ipfs/dagOperations.js';
/**
 * Checks if a given port is in use. Tries to craete a server and bind it to the port, if successful, closes the server, meaning the specified port it's not in use.
 * @param {number} port - The port number to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the port is in use, `false` otherwise.
 */
export declare const isPortInUse: (port: number) => Promise<boolean>;
export declare function withContext(fn: () => Promise<void>): Promise<void>;
export declare function initializeContext(): Promise<void>;
export declare function deInitializeContext(): Promise<void>;
export declare function getBuffersFromFiles(paths: string[]): Shareable;
export declare function relaunchAsDaemon(): Promise<void>;
