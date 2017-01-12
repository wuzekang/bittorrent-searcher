import * as net from 'net';
import * as dgram from 'dgram';
import * as bencode from './bencode';
import { EventEmitter } from 'events';
import * as KBucket from 'k-bucket';
import { randomBytes } from 'crypto'

import * as Protocol from 'bittorrent-protocol';
import * as ut_metadata from 'ut_metadata';
import * as parseTorrent from 'parse-torrent';

import Queue from './priority-queue';
//90289fd34dfc1cf8f316a268add8354c85334458

export interface Message {
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

export interface Query {
    method: string,
    data: any,
    peer: Peer,
    response: Function,
    timer?: NodeJS.Timer
}

export enum Priority {
    High, Medium, Low
}

export class KRPC extends EventEmitter {
    concurrency = 100;

    _running = new Map();
    _pending = new Queue<Priority, Query>();
    
    _tick = 0;

    _socket = dgram.createSocket('udp4');

    constructor() {
        super();
        this._socket.on('message', (data, rinfo) => {
            try {
                let message: Message = bencode.decode(data),
                    type = message.y.toString();
                if (type == 'r' || type == 'e') {
                    let tid = message.t.readUInt16BE(0),
                        query = this._running.get(tid);
                    if (query) query.response(message[type], rinfo);
                } else if (type == 'q') {
                    let tid = message.t.readUInt16BE(0),
                        query : any = {
                            method: message.q.toString(),
                            data: message.a,
                            peer: {host: rinfo.address, port: rinfo.port},
                            response: this._response(message, rinfo)
                        };
                        
                    this.emit('query', query);
                }
            } catch (error) {
                
            }
        })

        this._socket.on('error', err => {

        })
    }

    _response(message, rinfo) {
        let _message = message;
        return async data =>  {
            data = await data;
            let message = {
                t: _message.t,
                y: 'r',
                r: data
            }
            this._socket.send(bencode.encode(message), rinfo.port, rinfo.address);
        }
    }

    _runQueries() {
        
        while(this._pending.size &&  this._running.size < this.concurrency) {
            let query = this._pending.pop();

            let {method, data, peer, response} = query;

            let tid = this._tick ++;
            
            if (tid >= 0xFFFF) this._tick = 0;

            let message: Message = {
                t: new Buffer(2),
                y: 'q',
                q: method,
            };

            if (data) message.a = data;

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

    query(peer: Peer, method, data = null, priority = Priority.Medium) {

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


            this._pending.push({method: method, data: data, peer: peer, response: response}, priority);
            this._runQueries();

        })
    }

}


export class DHT extends EventEmitter {

    id = randomBytes(20);
    K = 20;

    static BOOTSTRAP_NODES: Array<Peer> = [
        { host: 'router.bittorrent.com', port: 6881 },
        { host: 'router.utorrent.com', port: 6881 },
        { host: 'dht.transmissionbt.com', port: 6881 }
    ]

    _krpc = new KRPC();
    _table = new KBucket({ localNodeId: this.id });

    constructor() {
        super();
        this._krpc.on('query', async query => {
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
                    let {port, implied_port, info_hash} = data;
                    peer.port = !implied_port && port > 0 && port < 0xFFFF ? port : peer.port;
                    let metadata = await this.metadata(info_hash, [peer]);
                    this.emit('metadata', info_hash.toString('hex'), metadata, peer);
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
    
    listen(port?:number, address?:string, callback?: () => void) : void {
        this._krpc._socket.bind(port, address, callback);
    }

    lookup(target, table = new KBucket({localNodeId: target})) {
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
            const next = async () => {
                let results : any  = await queries(),
                    peers = [];
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
            };
            next();
        })
    }

    metadata(target, peers = null) {
        let table = new KBucket({localNodeId: target});
        let retries = 8;

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
            let next = async () => {
                if (-- retries < 0) {
                    resolve(null);
                } else {
                    let _peers = peers || await this.lookup(target, table),
                        metadata = await fetch(_peers);
                    if (metadata) {
                        resolve(metadata);
                    } else {
                        peers = null;
                        next();
                    }
                }
            }
            next();
        })
    }

    crawle(concurrency = 200) {

        let running = 0, cache = [];

        const query = (node) => {
            
            if (node && cache.length < concurrency) cache.push(node);

            if (cache.length && running < concurrency) {
                ++ running;
                let node = cache.shift(),
                    id = this._closestID(node);
                
                this._krpc.query(node, 'find_node', {id: id, target: randomBytes(20)}, Priority.Low).then(next);
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

}

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
