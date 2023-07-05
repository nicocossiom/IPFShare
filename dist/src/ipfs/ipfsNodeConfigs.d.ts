interface IpfsNodeConfigOptions {
    apiPort: number;
    gateawayPort: number;
    swarmPort: number;
}
export declare function newNodeConfig(type?: "go" | "js", options?: IpfsNodeConfigOptions): {
    API: {
        HTTPHeaders: {};
    };
    Addresses: {
        API: string;
        Announce: never[];
        AppendAnnounce: never[];
        Gateway: string;
        NoAnnounce: never[];
        Swarm: string[];
    };
    AutoNAT: {};
    Bootstrap: string[];
    DNS: {
        Resolvers: {};
    };
    Datastore: {
        BloomFilterSize: number;
        GCPeriod: string;
        HashOnRead: boolean;
        Spec: {
            mounts: ({
                child: {
                    path: string;
                    shardFunc: string;
                    sync: boolean;
                    type: string;
                    compression?: undefined;
                };
                mountpoint: string;
                prefix: string;
                type: string;
            } | {
                child: {
                    compression: string;
                    path: string;
                    type: string;
                    shardFunc?: undefined;
                    sync?: undefined;
                };
                mountpoint: string;
                prefix: string;
                type: string;
            })[];
            type: string;
        };
        StorageGCWatermark: number;
        StorageMax: string;
    };
    Discovery: {
        MDNS: {
            Enabled: boolean;
        };
    };
    Experimental: {
        AcceleratedDHTClient: boolean;
        FilestoreEnabled: boolean;
        GraphsyncEnabled: boolean;
        Libp2pStreamMounting: boolean;
        P2pHttpProxy: boolean;
        StrategicProviding: boolean;
        UrlstoreEnabled: boolean;
    };
    Gateway: {
        APICommands: never[];
        HTTPHeaders: {
            "Access-Control-Allow-Headers": string[];
            "Access-Control-Allow-Methods": string[];
            "Access-Control-Allow-Origin": string[];
        };
        NoDNSLink: boolean;
        NoFetch: boolean;
        PathPrefixes: never[];
        PublicGateways: null;
        RootRedirect: string;
    };
    Internal: {};
    Ipns: {
        RecordLifetime: string;
        RepublishPeriod: string;
        ResolveCacheSize: number;
        UsePubsub: boolean;
    };
    Migration: {
        DownloadSources: never[];
        Keep: string;
    };
    Peering: {
        Peers: null;
    };
    Pinning: {
        RemoteServices: {};
    };
    Plugins: {
        Plugins: null;
    };
    Provider: {
        Strategy: string;
    };
    Pubsub: {
        Router: string;
        Enabled: boolean;
        DisableSigning: boolean;
    };
    Reprovider: {};
    Routing: {
        Methods: null;
        Routers: null;
    };
    Swarm: {
        AddrFilters: null;
        ConnMgr: {};
        DisableBandwidthMetrics: boolean;
        DisableNatPortMap: boolean;
        RelayClient: {
            AutoRelay: {
                Enabled: boolean;
            };
            RelayService: {};
            ResourceMgr: {
                Limits: {};
            };
            Transports: {
                Multiplexers: {};
                Network: {};
                Security: {};
            };
        };
    };
} | {
    Bootstrap: string[];
    Routing: {
        Type: string;
    };
    Addresses: {
        Delegates: string[];
        Swarm: string[];
        API: string;
        Gateway: string;
        RPC: string;
    };
    Pubsub: {
        Enabled: boolean;
        Router: string;
    };
    Swarm: {
        RelayClient: {
            Enabled: boolean;
        };
        ConnMgr: {
            LowWater: number;
            HighWater: number;
        };
        DisableNatPortMap: boolean;
    };
    Discovery: {
        MDNS: {
            Enabled: boolean;
            Interval: number;
        };
        webRTCStar: {
            Enabled: boolean;
        };
    };
    API: {
        HTTPHeaders: {
            "Access-Control-Allow-Origin": string[];
            "Access-Control-Allow-Methods": string[];
        };
    };
    EXPERIMENTAL: {
        ipnsPubsub: boolean;
    };
};
export {};
