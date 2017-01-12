import * as net from 'net';
import * as dgram from 'dgram';
import * as bencode from './bencode';
import { EventEmitter } from 'events';
import * as KBucket from 'k-bucket';
import { randomBytes } from 'crypto'

import * as Protocol from 'bittorrent-protocol';
import * as ut_metadata from 'ut_metadata';
import * as parseTorrent from 'parse-torrent';

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
    concurrency = 100;

    _running = new Map();
    _pending = new Array();
    
    _tick = 0;

    _socket = dgram.createSocket('udp4');

    constructor() {
        super();
        this._socket.on('message', (data, rinfo) => {
            let message: Message = bencode.decode(data),
                type = message.y.toString();
            if (type == 'r' || type == 'e') {
                try {
                    let tid = message.t.readUInt16BE(0),
                        query = this._running.get(tid);
                    if (query) query.response(message[type], rinfo);
                } catch (error) {
                }
            } else if (type == 'q') {
                try {
                    let tid = message.t.readUInt16BE(0),
                        query : any = {
                            method: message.q.toString(),
                            data: message.a,
                            peer: {host: rinfo.address, port: rinfo.port},
                            response: this._response(message, rinfo)
                        };
                        
                    this.emit('query', query);
                } catch (error) {
                }
            }
        });
    }

    _response(message, rinfo) {
        let _message = message;
        return data => {
            Promise.resolve(data).then(data => {
                let message = {
                    t: _message.t,
                    y: 'r',
                    r: data
                }
                this._socket.send(bencode.encode(message), rinfo.port, rinfo.address);
            })
        }
    }

    _runQueries() {
        
        while(this._pending.length &&  this._running.size < this.concurrency) {
            let query = this._pending.shift();

            let {message, peer, response} = query;

            let tid = this._tick ++;
            
            if (tid >= 0xFFFF) this._tick = 0;

            message.t.writeUInt16BE(tid, 0);
            
            query.response = (data, rinfo) => {
                clearTimeout(query.timer);
                this._running.delete(tid);
                response(data, rinfo);
                this._runQueries();
            }

            query.timer = setTimeout(() => {
                query.response(null, null);
            }, 1000);
            
            this._running.set(tid, query);
            this._socket.send(bencode.encode(message), peer.port, peer.host);
        }
    }

    query(peer: Peer, method, data?: Object) {

        let message: Message = {
            t: new Buffer(2),
            y: 'q',
            q: method,
        };

        if (data) message.a = data;

        return new Promise((resolve, reject) => {

            let response = (data, rinfo) => {
                if (data) {
                    if (data.nodes)
                        data.nodes = parseNodes(data.nodes);
                    if (data.values && method == 'get_peers')
                        data.values = decodePeers(data.values);
                }

                resolve(data);
            };

            this._pending.push({message: message, peer: peer, response: response});
            this._runQueries();

        })
    }

}


export class DHT extends EventEmitter {

    id = Buffer.from('90289fd34dfc1cf8f316a268add8354c85334458', 'hex');
    K = 20;

    static BOOTSTRAP_NODES: Array<Peer> = [
        { host: 'router.bittorrent.com', port: 6881 },
        { host: 'router.utorrent.com', port: 6881 },
        { host: 'dht.transmissionbt.com', port: 6881 }
    ]

    _krpc = new KRPC();
    
    _tables = [];
    
    

    constructor() {
        super();
        this._krpc.on('query', query => {
            let {peer, method, data, response} = query;
            let id = this._closestID(data);

            switch (method) {
                case 'ping':
                    response({ id: id })
                    break;
                case 'find_node':
                    response({ id: id, nodes: '' });
                    break;
                case 'get_peers':
                    response({ id: id, nodes: '', token: 'TAOBKCEN' });
                    break;
                case 'announce_peer':
                    response({ id: id });
                    console.log(data);
                    break;
                default:
                    break;
            }
        })
    }

    _closestID(node) {
        if (node.id) {
            let id = new Buffer(node.id);
            for(let i =  id.length; i >= 0; --i) {
                if (id[i] != this.id[i]) {
                    id[i] = this.id[i];
                    break;
                }
            }
            return id;
        }
        return this.id;
    }

    lookup(target, table = new KBucket({localNodeId: target})) {
        console.log('DHT.lookup');
        table.removeAllListeners('ping');
        table.on('ping', (oldNodes, newNode) => {
            oldNodes.forEach(node => table.remove(node.id));
            table.add(newNode);
        })
        const closest = () => {
            return table.count() > DHT.BOOTSTRAP_NODES.length
                ? table.closest(target, this.K)
                : DHT.BOOTSTRAP_NODES;
        }

        const queries = () => {
            return Promise.all(closest().map((peer) => {
                return this._krpc.query(peer, 'get_peers', {id: this._closestID(peer), info_hash: target});
            }));
        }

        return new Promise((resolve) => {
            const next = () => {
                queries().then((results: any) => {
                    let peers = [];
                    results.filter(result => result).forEach(result => {
                        let {nodes, values} = result;
                        if (nodes) nodes.forEach(node => table.add(node));                
                        if (values) peers = peers.concat(values);
                    })
                    if (peers.length == 0) {
                        next();
                    } else {
                        resolve(peers);
                    }
                })
            };
            next();
        })
    }

    metadata(target, peers = null) {
        console.log('DHT.metadata');
        let table = new KBucket({localNodeId: target});

        const fetch = (peers) => {
            let promises = peers.map(peer => {
                return new Promise((resolve) => {
                    let socket = net.connect(peer.port, peer.host, () => {

                        let wire = new Protocol();
                        socket.pipe(wire).pipe(socket);
                        wire.use(ut_metadata());
                        
                        wire.handshake(target, this.id);

                        wire.ut_metadata.on('metadata', (metadata) => {
                            resolve(metadata);
                        })

                        wire.on('handshake', () => {
                            wire.ut_metadata.fetch();
                        })
                    })

                    setTimeout(() => {
                        socket.destroy();
                        resolve(null);
                    }, 5000);

                    socket.on('error', err => {
                        resolve(null);
                    })
                })
            })
            return Promise.all(promises).then(results => {
                return results.find(value => value != null) || null;
            });
        }

        return new Promise((resolve) => {
            let next = () => {
                Promise.resolve(peers || this.lookup(target, table)).then((_peers) => {
                    console.log(_peers.length);
                    peers = null;
                    fetch(_peers).then((metadata) => {
                        if (metadata) resolve(metadata);
                        else next();
                    })
                })
            }
            next();
        })
    }

    crawle(concurrency = 200) {

        let running = 0, cache = [];

        const query = (node) => {
            if (node && cache.length < concurrency) cache.push(node);

            if (running < concurrency) {
                ++ running;
                let node = cache.shift(),
                    id = this._closestID(node);
                this._krpc.query(node, 'find_node', {id: id, target: randomBytes(20)}).then(next);
            }

        }

        const next = (data) => {
            -- running;

            if (data && data.nodes && data.nodes.length) {
                data.nodes.forEach(query)
            } else {
                query(null);
            }

        }

        DHT.BOOTSTRAP_NODES.forEach(query)

    }

    createRouter(target) {
        let table = new KBucket({localNodeId: target}),
            method = 'find_node',
            args = {id: target, target: target};
        
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

spider.metadata(target).then(metadata => {
    console.log(metadata);
})

function decodePeers (buf) {
  var peers = []

  try {
    for (var i = 0; i < buf.length; i++) {
      var port = buf[i].readUInt16BE(4)
      if (!port) continue
      peers.push({
        host: parseIp(buf[i], 0),
        port: port
      })
    }
  } catch (err) {
    // do nothing
  }

  return peers
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

function parseIp(buf, offset) {
    return buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++]
}
