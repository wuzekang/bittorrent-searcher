import * as dgram from 'dgram';
import * as bencode from './bencode';
import { EventEmitter } from 'events';
import * as KBucket from 'k-bucket';
import { randomBytes } from 'crypto'
interface Message {
    t: Buffer,
    y: String,
    q: String,
    a?: any
    e?: any,
    r?: any
}

export interface Peer {
    host: string,
    port: number
}

export interface Node extends Peer {
    id: Buffer,
    token?: string
}

export class KRPC extends EventEmitter {
    concurrency = 30;

    _runningQueries = [];
    _pendingQueries = [];

    _running = 0;


    _socket = dgram.createSocket('udp4');

    constructor() {
        super();
        this._socket.on('message', (data, rinfo) => {
            let message: Message = bencode.decode(data),
                type = message.y.toString(),
                tid = message.t.readUInt16BE(0),
                req = this._runningQueries[tid];
            
            if (req) {
                let {callback} = req;

                switch (type) {
                    case 'r':
                        callback(message.r, rinfo);
                        break;
                    case 'e':
                        callback(message.e, rinfo);
                        break;
                    case 'q':
                        this.emit('query', message, rinfo);
                        break;
                    default:
                        break;
                }
            }

        });
    }

    _runQueries() {
        console.log(this._pendingQueries.length, this._runningQueries.length, this._running);
        while(this._pendingQueries.length &&  this._running < this.concurrency) {
            let req = this._pendingQueries.shift();

            let {message, peer, callback} = req;

            let tid = this._runningQueries.indexOf(null);
            if (tid < 0) tid = this._runningQueries.length;
            message.t.writeUInt16BE(tid, 0);

            req.callback = (data, rinfo) => {
                clearTimeout(req.timer);
                callback(data, rinfo);

                this._runningQueries[tid] = null;
                -- this._running;

                this._runQueries();
            }

            req.timer = setTimeout(() => {
                req.callback(null, null);
            }, 1000);
            
            ++ this._running;
            this._runningQueries[tid] = req;
            this._socket.send(bencode.encode(message), peer.port, peer.host);
        }
    }

    query(peer: Peer, method, args?: Object) {

        let data: Message = {
            t: new Buffer(2),
            y: 'q',
            q: method,
        };

        if (args) data.a = args;

        return new Promise((resolve, reject) => {

            let callback = (data, rinfo) => {
                if (data) {
                    if (data.nodes)
                        data.nodes = parseNodes(data.nodes);
                    if (data.values && method == 'get_peers')
                        data.values = parsePeers(data.values);
                }

                resolve(data);
            };

            this._pendingQueries.push({message: data, peer: peer, callback: callback});
            this._runQueries();

        })
    }

}


export class DHT extends EventEmitter {

    static BOOTSTRAP_NODES: Array<Peer> = [
        { host: 'router.bittorrent.com', port: 6881 },
        { host: 'router.utorrent.com', port: 6881 },
        { host: 'dht.transmissionbt.comc', port: 6881 }
    ]

    _krpc = new KRPC();
    
    _tables = [];
    
    constructor() {
        super();
        this._krpc.on('query', (message, rinfo) => {
            console.log(message);
        })
    }

    lookup(target) {

        let table = new KBucket({localNodeId: target}),
            method = 'get_peers',
            args = {id: randomBytes(20), info_hash: target};


        const queries = (peers) => {
            return Promise.all(peers.map((peer) => {
                return this._krpc.query(peer, method, args);
            }));
        }

        return new Promise((resolve) => {
            const next = (results: any) => {
                let peers = [];
                results.filter(result => result).forEach(result => {
                    let {nodes, values} = result;
                    if (nodes) nodes.forEach(node => table.add(node));                
                    if (values) peers = peers.concat(values);
                })

                if (peers.length == 0) {
                    queries(table.closest(target, 10)).then(next);
                } else {
                    resolve(peers);
                }
            };

            queries(DHT.BOOTSTRAP_NODES).then(next);
        })
    }

    createRouter(target) {
        let table = new KBucket({localNodeId: target}),
            method = 'find_node',
            args = {id: randomBytes(20), target: target};
        
        this._tables.push(table);

        const queries = (peers) => {
            return Promise.all(peers.map((peer) => {
                return this._krpc.query(peer, method, args);
            }));
        }

        return new Promise((resolve) => {
            const next = (results: any) => {
                let count = table.count();
                results.filter(result => result).forEach(result => {
                    let {nodes} = result;
                    if (nodes) nodes.forEach(node => table.add(node));                
                })

                if (count == 0 || table.count() - count > 0) {
                    queries(table.closest(target, 20)).then(next);
                } else {
                    resolve(table);
                }
                
            };
            queries(DHT.BOOTSTRAP_NODES).then(next);
        })
    }

}


let spider = new DHT();
let target = Buffer.from('90289fd34dfc1cf8f316a268add8354c85334458', 'hex');

spider.lookup(target).then(peers => {
    //console.log(peers);
})

for(let i = 0; i < 20; i ++) {
    spider.createRouter(randomBytes(20)).then( (table: any) => {
        console.log(table.count());
    })
}



function parsePeers(peers) {
    if (!Array.isArray(peers)) return [];
    return peers.map(peer => {
        return {
            host: parseIp(peer),
            port: peer.readUInt16BE(4)
        }
    })
}

function parseNodes(buf) {
    var contacts = []

    try {
        for (var i = 0; i < buf.length; i += 26) {
            var port = buf.readUInt16BE(i + 24)
            if (!port) continue
            contacts.push({
                id: buf.slice(i, i + 20),
                host: parseIp(buf, i + 20),
                port: port
            })
        }
    } catch (err) {
        
    }
    return contacts
}

function parseIp(buf, offset = 0) {
    return buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++]
}
