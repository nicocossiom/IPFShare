/// <reference types="orbit-db/identity.js" />
export interface Key {
    id: string;
    name: string;
}
export declare function getIdentity(): Promise<import("orbit-db-identity-provider").Identity>;
