/// <reference types="orbit-db/identity" />
export interface Key {
    id: string;
    name: string;
}
export declare function getIdentity(orbitdbPath: string): Promise<import("orbit-db-identity-provider").Identity>;
