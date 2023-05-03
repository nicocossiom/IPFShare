interface IpfsNodeConfigOptions {
    apiPort: number,
    gateawayPort: number,
    swarmPort: number 
}

const newJsConfig = (opts: IpfsNodeConfigOptions) => {
    return {
        // repo: jsIPFSRepo,
        Bootstrap: [
            '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
            '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
            '/dns4/node1.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6',
            '/dns4/node2.preload.ipfs.io/tcp/44 3/wss/p2p/QmV7gnbW5VTcJ3oyM2Xk1rdFBJ3kTkvxc87UFGsun29STS',
            '/dns4/node3.preload.ipfs.io/tcp/443/wss/p2p/QmY7JB6MQXhxHvq7dBDh4HpbH29v4yE9JRadAVpndvzySN'
        ],
        Routing: {
            Type: 'dhtclient'
        },
        Addresses: {
            Delegates: [
                '/dns4/node0.delegate.ipfs.io/tcp/443/https',
                '/dns4/node1.delegate.ipfs.io/tcp/443/https',
                '/dns4/node2.delegate.ipfs.io/tcp/443/https',
                '/dns4/node3.delegate.ipfs.io/tcp/443/https'
            ],
            Swarm: [
                `/ip4/0.0.0.0/tcp/${opts.swarmPort}`,
                `/ip4/127.0.0.1/tcp/${opts.swarmPort+1}/ws`
            ],
                        
            API: `/ip4/127.0.0.1/tcp/${opts.apiPort}`, 
            Gateway: `/ip4/127.0.0.1/tcp/${opts.gateawayPort}`,
            RPC: `/ip4/127.0.0.1/tcp/${opts.apiPort+1}`,
        },
        Pubsub: {
            Enabled: true,
            PubSubRouter: 'gossipsub',
        }, 
        // Swarm: {
        //     RelayClient: {
        //         Enabled: true,
        //     },
        //     // EnableRelayHop: true,
        //     ConnMgr: {
        //         LowWater: 50,
        //         HighWater: 200
        //     },
        //     DisableNatPortMap: false
        // },
        Discovery: {
            MDNS: {
                Enabled: true,
                Interval: 10
            }, 
            webRTCStar: {
                Enabled: true
            }
        },
        API: {
            HTTPHeaders: {
                'Access-Control-Allow-Origin': ['*'],
                'Access-Control-Allow-Methods': ['PUT', 'GET', 'POST'],
                'Access-Control-Allow-Credentials': ['true'],
            },
        },
        EXPERIMENTAL: {
            ipnsPubsub: true,
        }, 
        // libp2p: libp2pConfig()
        
    }
}

const newGoConfig = (opts: IpfsNodeConfigOptions) => {
    return {
        'API': {
            'HTTPHeaders': {}
        },
        'Addresses': {
            'API': '/ip4/127.0.0.1/tcp/' + opts.apiPort,
            'Announce': [],
            'AppendAnnounce': [],
            'Gateway': '/ip4/127.0.0.1/tcp/' + opts.gateawayPort,
            'NoAnnounce': [],
            'Swarm': [
                `/ip4/0.0.0.0/tcp/${opts.swarmPort}`,
                `/ip6/::/tcp/${opts.swarmPort}`,
                `/ip4/0.0.0.0/udp/${opts.swarmPort}/quic`,
                `/ip4/0.0.0.0/udp/${opts.swarmPort}/quic-v1`,
                `/ip4/0.0.0.0/udp/${opts.swarmPort}/quic-v1/webtransport`,
                `/ip6/::/udp/${opts.swarmPort}/quic`,
                `/ip6/::/udp/${opts.swarmPort}/quic-v1`,
                `/ip6/::/udp/${opts.swarmPort}/quic-v1/webtransport`
            ]
        },
        'AutoNAT': {},
        'Bootstrap': [
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
            '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            '/ip4/104.131.131.82/udp/4001/quic/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb'
        ],
        'DNS': {
            'Resolvers': {}
        },
        'Datastore': {
            'BloomFilterSize': 0,
            'GCPeriod': '1h',
            'HashOnRead': false,
            'Spec': {
                'mounts': [
                    {
                        'child': {
                            'path': 'blocks',
                            'shardFunc': '/repo/flatfs/shard/v1/next-to-last/2',
                            'sync': true,
                            'type': 'flatfs'
                        },
                        'mountpoint': '/blocks',
                        'prefix': 'flatfs.datastore',
                        'type': 'measure'
                    },
                    {
                        'child': {
                            'compression': 'none',
                            'path': 'datastore',
                            'type': 'levelds'
                        },
                        'mountpoint': '/',
                        'prefix': 'leveldb.datastore',
                        'type': 'measure'
                    }
                ],
                'type': 'mount'
            },
            'StorageGCWatermark': 90,
            'StorageMax': '10GB'
        },
        'Discovery': {
            'MDNS': {
                'Enabled': true
            }
        },
        'Experimental': {
            'AcceleratedDHTClient': false,
            'FilestoreEnabled': false,
            'GraphsyncEnabled': false,
            'Libp2pStreamMounting': false,
            'P2pHttpProxy': false,
            'StrategicProviding': false,
            'UrlstoreEnabled': false
        },
        'Gateway': {
            'APICommands': [],
            'HTTPHeaders': {
                'Access-Control-Allow-Headers': [
                    'X-Requested-With',
                    'Range',
                    'User-Agent'
                ],
                'Access-Control-Allow-Methods': [
                    'GET'
                ],
                'Access-Control-Allow-Origin': [
                    '*'
                ]
            },
            'NoDNSLink': false,
            'NoFetch': false,
            'PathPrefixes': [],
            'PublicGateways': null,
            'RootRedirect': ''
        },
        // "Identity": {
        //     "PeerID": "12D3KooWHN8DzeTs9s4dpULQcAbuNRi24HPQJmse7u1fgMYQjcZ8",
        //     "PrivKey": "CAESQBoDdM0zHttB1KLdR+gt/O3nUGEXaXWzJSCWxkfOZHf1cCSgvUL+3EGg9oZNz8f97YkeZHhs1xEc4cwoG8bWFRM="
        // },
        'Internal': {},
        'Ipns': {
            'RecordLifetime': '',
            'RepublishPeriod': '',
            'ResolveCacheSize': 128
        },
        'Migration': {
            'DownloadSources': [],
            'Keep': ''
        },
        // "Mounts": {
        //     "FuseAllowOther": false,
        //     "IPFS": "/ipfs",
        //     "IPNS": "/ipns"
        // },
        'Peering': {
            'Peers': null
        },
        'Pinning': {
            'RemoteServices': {}
        },
        'Plugins': {
            'Plugins': null
        },
        'Provider': {
            'Strategy': ''
        },
        'Pubsub': {
            
            'DisableSigning': false,
            'Router': ''
        },
        'Reprovider': {},
        'Routing': {
            'Methods': null,
            'Routers': null
        },
        'Swarm': {
            'AddrFilters': null,
            'ConnMgr': {},
            'DisableBandwidthMetrics': false,
            'DisableNatPortMap': false,
            'RelayClient': {},
            'RelayService': {},
            'ResourceMgr': {
                'Limits': {}
            },
            'Transports': {
                'Multiplexers': {},
                'Network': {},
                'Security': {}
            }
        }
    }
}
export function newNodeConfig (type: 'go' | 'js' = 'go', options: IpfsNodeConfigOptions = { apiPort: 5002, gateawayPort: 8090, swarmPort: 4002} ) {
    if (type === 'go') {
        return newGoConfig(options)
    }
    return newJsConfig(options)
}
