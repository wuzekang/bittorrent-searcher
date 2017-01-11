"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var dgram = require("dgram");
var bencode = require("./bencode");
var events_1 = require("events");
var KBucket = require("k-bucket");
var crypto_1 = require("crypto");
var KRPC = (function (_super) {
    __extends(KRPC, _super);
    function KRPC() {
        var _this = _super.call(this) || this;
        _this.concurrency = 30;
        _this._runningQueries = [];
        _this._pendingQueries = [];
        _this._running = 0;
        _this._socket = dgram.createSocket('udp4');
        _this._socket.on('message', function (data, rinfo) {
            var message = bencode.decode(data), type = message.y.toString(), tid = message.t.readUInt16BE(0), req = _this._runningQueries[tid];
            if (req) {
                var callback = req.callback;
                switch (type) {
                    case 'r':
                        callback(message.r, rinfo);
                        break;
                    case 'e':
                        callback(message.e, rinfo);
                        break;
                    case 'q':
                        _this.emit('query', message, rinfo);
                        break;
                    default:
                        break;
                }
            }
        });
        return _this;
    }
    KRPC.prototype._runQueries = function () {
        var _this = this;
        console.log(this._pendingQueries.length, this._runningQueries.length, this._running);
        var _loop_1 = function () {
            var req = this_1._pendingQueries.shift();
            var message = req.message, peer = req.peer, callback = req.callback;
            var tid = this_1._runningQueries.indexOf(null);
            if (tid < 0)
                tid = this_1._runningQueries.length;
            message.t.writeUInt16BE(tid, 0);
            req.callback = function (data, rinfo) {
                clearTimeout(req.timer);
                callback(data, rinfo);
                _this._runningQueries[tid] = null;
                --_this._running;
                _this._runQueries();
            };
            req.timer = setTimeout(function () {
                req.callback(null, null);
            }, 1000);
            ++this_1._running;
            this_1._runningQueries[tid] = req;
            this_1._socket.send(bencode.encode(message), peer.port, peer.host);
        };
        var this_1 = this;
        while (this._pendingQueries.length && this._running < this.concurrency) {
            _loop_1();
        }
    };
    KRPC.prototype.query = function (peer, method, args) {
        var _this = this;
        var data = {
            t: new Buffer(2),
            y: 'q',
            q: method,
        };
        if (args)
            data.a = args;
        return new Promise(function (resolve, reject) {
            var callback = function (data, rinfo) {
                if (data) {
                    if (data.nodes)
                        data.nodes = parseNodes(data.nodes);
                    if (data.values && method == 'get_peers')
                        data.values = parsePeers(data.values);
                }
                resolve(data);
            };
            _this._pendingQueries.push({ message: data, peer: peer, callback: callback });
            _this._runQueries();
        });
    };
    return KRPC;
}(events_1.EventEmitter));
exports.KRPC = KRPC;
var DHT = (function (_super) {
    __extends(DHT, _super);
    function DHT() {
        var _this = _super.call(this) || this;
        _this._krpc = new KRPC();
        _this._tables = [];
        _this._krpc.on('query', function (message, rinfo) {
            console.log(message);
        });
        return _this;
    }
    DHT.prototype.lookup = function (target) {
        var _this = this;
        var table = new KBucket({ localNodeId: target }), method = 'get_peers', args = { id: crypto_1.randomBytes(20), info_hash: target };
        var queries = function (peers) {
            return Promise.all(peers.map(function (peer) {
                return _this._krpc.query(peer, method, args);
            }));
        };
        return new Promise(function (resolve) {
            var next = function (results) {
                var peers = [];
                results.filter(function (result) { return result; }).forEach(function (result) {
                    var nodes = result.nodes, values = result.values;
                    if (nodes)
                        nodes.forEach(function (node) { return table.add(node); });
                    if (values)
                        peers = peers.concat(values);
                });
                if (peers.length == 0) {
                    queries(table.closest(target, 10)).then(next);
                }
                else {
                    resolve(peers);
                }
            };
            queries(DHT.BOOTSTRAP_NODES).then(next);
        });
    };
    DHT.prototype.createRouter = function (target) {
        var _this = this;
        var table = new KBucket({ localNodeId: target }), method = 'find_node', args = { id: crypto_1.randomBytes(20), target: target };
        this._tables.push(table);
        var queries = function (peers) {
            return Promise.all(peers.map(function (peer) {
                return _this._krpc.query(peer, method, args);
            }));
        };
        return new Promise(function (resolve) {
            var next = function (results) {
                var count = table.count();
                results.filter(function (result) { return result; }).forEach(function (result) {
                    var nodes = result.nodes;
                    if (nodes)
                        nodes.forEach(function (node) { return table.add(node); });
                });
                if (count == 0 || table.count() - count > 0) {
                    queries(table.closest(target, 20)).then(next);
                }
                else {
                    resolve(table);
                }
            };
            queries(DHT.BOOTSTRAP_NODES).then(next);
        });
    };
    return DHT;
}(events_1.EventEmitter));
DHT.BOOTSTRAP_NODES = [
    { host: 'router.bittorrent.com', port: 6881 },
    { host: 'router.utorrent.com', port: 6881 },
    { host: 'dht.transmissionbt.comc', port: 6881 }
];
exports.DHT = DHT;
var spider = new DHT();
var target = Buffer.from('90289fd34dfc1cf8f316a268add8354c85334458', 'hex');
spider.lookup(target).then(function (peers) {
    //console.log(peers);
});
for (var i = 0; i < 20; i++) {
    spider.createRouter(crypto_1.randomBytes(20)).then(function (table) {
        console.log(table.count());
    });
}
function parsePeers(peers) {
    if (!Array.isArray(peers))
        return [];
    return peers.map(function (peer) {
        return {
            host: parseIp(peer),
            port: peer.readUInt16BE(4)
        };
    });
}
function parseNodes(buf) {
    var contacts = [];
    try {
        for (var i = 0; i < buf.length; i += 26) {
            var port = buf.readUInt16BE(i + 24);
            if (!port)
                continue;
            contacts.push({
                id: buf.slice(i, i + 20),
                host: parseIp(buf, i + 20),
                port: port
            });
        }
    }
    catch (err) {
    }
    return contacts;
}
function parseIp(buf, offset) {
    if (offset === void 0) { offset = 0; }
    return buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++];
}
