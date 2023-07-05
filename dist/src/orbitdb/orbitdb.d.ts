import OrbitDB from "orbit-db";
export declare function getOrbitDB(daemon?: boolean): Promise<OrbitDB>;
export declare function determineAddress(): Promise<OrbitDB | undefined>;
