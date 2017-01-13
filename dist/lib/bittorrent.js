"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var net = require("net");
var dgram = require("dgram");
var bencode = require("./bencode");
var events_1 = require("events");
var KBucket = require("k-bucket");
var crypto_1 = require("crypto");
var Protocol = require("bittorrent-protocol");
var ut_metadata = require("ut_metadata");
var priority_queue_1 = require("./priority-queue");
var Priority;
(function (Priority) {
    Priority[Priority["High"] = 0] = "High";
    Priority[Priority["Medium"] = 1] = "Medium";
    Priority[Priority["Low"] = 2] = "Low";
})(Priority = exports.Priority || (exports.Priority = {}));
var KRPC = (function (_super) {
    __extends(KRPC, _super);
    function KRPC() {
        var _this = _super.call(this) || this;
        _this.concurrency = 100;
        _this._running = new Map();
        _this._pending = new priority_queue_1.default();
        _this._tick = 0;
        _this._socket = dgram.createSocket('udp4');
        _this._socket.on('message', function (data, rinfo) {
            try {
                var message = bencode.decode(data), type = message.y.toString();
                if (type == 'r' || type == 'e') {
                    var tid = message.t.readUInt16BE(0), query = _this._running.get(tid);
                    if (query)
                        query.response(message[type], rinfo);
                }
                else if (type == 'q') {
                    var tid = message.t.readUInt16BE(0), query = {
                        method: message.q.toString(),
                        data: message.a,
                        peer: { host: rinfo.address, port: rinfo.port },
                        response: _this._response(message, rinfo)
                    };
                    _this.emit('query', query);
                }
            }
            catch (error) {
            }
        });
        _this._socket.on('error', function (err) {
        });
        return _this;
    }
    KRPC.prototype._response = function (message, rinfo) {
        var _this = this;
        var _message = message;
        return function (data) { return __awaiter(_this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, data];
                    case 1:
                        data = _a.sent();
                        message = {
                            t: _message.t,
                            y: 'r',
                            r: data
                        };
                        this._socket.send(bencode.encode(message), rinfo.port, rinfo.address);
                        return [2 /*return*/];
                }
            });
        }); };
    };
    KRPC.prototype._runQueries = function () {
        var _this = this;
        var _loop_1 = function () {
            var query = this_1._pending.pop();
            var method = query.method, data = query.data, peer = query.peer, response = query.response;
            var tid = this_1._tick++;
            if (tid >= 0xFFFF)
                this_1._tick = 0;
            var message = {
                t: new Buffer(2),
                y: 'q',
                q: method,
            };
            if (data)
                message.a = data;
            message.t.writeUInt16BE(tid, 0);
            query.response = function (data, rinfo) {
                clearTimeout(query.timer);
                _this._running.delete(tid);
                response(data, rinfo);
                _this._runQueries();
            };
            query.timer = setTimeout(function () {
                query.response(null, null);
            }, 1000);
            this_1._running.set(tid, query);
            this_1._socket.send(bencode.encode(message), peer.port, peer.host);
        };
        var this_1 = this;
        while (this._pending.size && this._running.size < this.concurrency) {
            _loop_1();
        }
    };
    KRPC.prototype.query = function (peer, method, data, priority) {
        var _this = this;
        if (data === void 0) { data = null; }
        if (priority === void 0) { priority = Priority.Medium; }
        return new Promise(function (resolve, reject) {
            var response = function (data, rinfo) {
                if (data) {
                    if (data.nodes)
                        data.nodes = parseNodes(data.nodes);
                    if (data.values && method == 'get_peers')
                        data.values = decodePeers(data.values);
                }
                resolve(data);
            };
            _this._pending.push({ method: method, data: data, peer: peer, response: response }, priority);
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
        _this.id = crypto_1.randomBytes(20);
        _this.K = 20;
        _this._krpc = new KRPC();
        _this._table = new KBucket({ localNodeId: _this.id });
        _this._krpc.on('query', function (query) { return __awaiter(_this, void 0, void 0, function () {
            var peer, method, data, response, id, _a, port, implied_port, info_hash, metadata;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        peer = query.peer, method = query.method, data = query.data, response = query.response;
                        id = this._closestID(data);
                        _a = method;
                        switch (_a) {
                            case 'ping': return [3 /*break*/, 1];
                            case 'find_node': return [3 /*break*/, 2];
                            case 'get_peers': return [3 /*break*/, 3];
                            case 'announce_peer': return [3 /*break*/, 4];
                        }
                        return [3 /*break*/, 6];
                    case 1:
                        response({ id: id });
                        return [3 /*break*/, 7];
                    case 2:
                        response({ id: id, nodes: '' });
                        return [3 /*break*/, 7];
                    case 3:
                        response({ id: id, nodes: '', token: 'TAOBKCEN' });
                        return [3 /*break*/, 7];
                    case 4:
                        response({ id: id });
                        port = data.port, implied_port = data.implied_port, info_hash = data.info_hash;
                        peer.port = !implied_port && port > 0 && port < 0xFFFF ? port : peer.port;
                        return [4 /*yield*/, this.metadata(info_hash, [peer])];
                    case 5:
                        metadata = _b.sent();
                        this.emit('metadata', info_hash.toString('hex'), metadata, peer);
                        return [3 /*break*/, 7];
                    case 6: return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        }); });
        return _this;
    }
    DHT.prototype._closestID = function (node) {
        if (node.id) {
            var id = new Buffer(node.id);
            for (var i = id.length; i >= 0; --i) {
                if (id[i] != this.id[i]) {
                    id[i] = this.id[i];
                    break;
                }
            }
            return id;
        }
        return this.id;
    };
    DHT.prototype.listen = function (port, address, callback) {
        this._krpc._socket.bind(port, address, callback);
    };
    DHT.prototype.lookup = function (target, table) {
        var _this = this;
        if (table === void 0) { table = new KBucket({ localNodeId: target }); }
        table.removeAllListeners('ping');
        table.on('ping', function (oldNodes, newNode) {
            oldNodes.forEach(function (node) { return table.remove(node.id); });
            table.add(newNode);
        });
        var closest = function () {
            return table.count() > DHT.BOOTSTRAP_NODES.length
                ? table.closest(target, _this.K)
                : DHT.BOOTSTRAP_NODES;
        };
        var queries = function () {
            return Promise.all(closest().map(function (peer) {
                return _this._krpc.query(peer, 'get_peers', { id: _this._closestID(peer), info_hash: target });
            }));
        };
        return new Promise(function (resolve) {
            var next = function () { return __awaiter(_this, void 0, void 0, function () {
                var results, peers;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, queries()];
                        case 1:
                            results = _a.sent(), peers = [];
                            results.filter(function (result) { return result; }).forEach(function (result) {
                                var nodes = result.nodes, values = result.values;
                                if (nodes)
                                    nodes.forEach(function (node) { return table.add(node); });
                                if (values)
                                    peers = peers.concat(values);
                            });
                            if (peers.length == 0) {
                                next();
                            }
                            else {
                                resolve(peers);
                            }
                            return [2 /*return*/];
                    }
                });
            }); };
            next();
        });
    };
    DHT.prototype.metadata = function (target, peers) {
        var _this = this;
        if (peers === void 0) { peers = null; }
        var table = new KBucket({ localNodeId: target });
        var retries = 8;
        var fetch = function (peers) {
            var promises = peers.map(function (peer) {
                return new Promise(function (resolve) {
                    var socket = net.connect(peer.port, peer.host, function () {
                        var wire = new Protocol();
                        socket.pipe(wire).pipe(socket);
                        wire.use(ut_metadata());
                        wire.handshake(target, _this.id);
                        wire.ut_metadata.on('metadata', function (metadata) {
                            resolve(metadata);
                        });
                        wire.on('handshake', function () {
                            wire.ut_metadata.fetch();
                        });
                    });
                    setTimeout(function () {
                        socket.destroy();
                        resolve(null);
                    }, 5000);
                    socket.on('error', function (err) {
                        resolve(null);
                    });
                });
            });
            return Promise.all(promises).then(function (results) {
                return results.find(function (value) { return value != null; }) || null;
            });
        };
        return new Promise(function (resolve) {
            var next = function () { return __awaiter(_this, void 0, void 0, function () {
                var _peers, metadata, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(--retries < 0)) return [3 /*break*/, 1];
                            resolve(null);
                            return [3 /*break*/, 5];
                        case 1:
                            _a = peers;
                            if (_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.lookup(target, table)];
                        case 2:
                            _a = (_b.sent());
                            _b.label = 3;
                        case 3:
                            _peers = _a;
                            return [4 /*yield*/, fetch(_peers)];
                        case 4:
                            metadata = _b.sent();
                            if (metadata) {
                                resolve(metadata);
                            }
                            else {
                                peers = null;
                                next();
                            }
                            _b.label = 5;
                        case 5: return [2 /*return*/];
                    }
                });
            }); };
            next();
        });
    };
    DHT.prototype.crawle = function (concurrency) {
        var _this = this;
        if (concurrency === void 0) { concurrency = 200; }
        var running = 0, cache = [];
        var query = function (node) {
            if (node && cache.length < concurrency)
                cache.push(node);
            if (cache.length && running < concurrency) {
                ++running;
                var node_1 = cache.shift(), id = _this._closestID(node_1);
                _this._krpc.query(node_1, 'find_node', { id: id, target: crypto_1.randomBytes(20) }, Priority.Low).then(next);
            }
        };
        var next = function (data) {
            --running;
            if (data && data.nodes && data.nodes.length) {
                data.nodes.forEach(query);
            }
            else {
                query(null);
            }
        };
        DHT.BOOTSTRAP_NODES.forEach(query);
    };
    return DHT;
}(events_1.EventEmitter));
DHT.BOOTSTRAP_NODES = [
    { host: 'router.bittorrent.com', port: 6881 },
    { host: 'router.utorrent.com', port: 6881 },
    { host: 'dht.transmissionbt.com', port: 6881 }
];
exports.DHT = DHT;
function decodePeers(buf) {
    var peers = [];
    try {
        for (var i = 0; i < buf.length; i++) {
            var port = buf[i].readUInt16BE(4);
            if (!port)
                continue;
            peers.push({
                host: parseIp(buf[i], 0),
                port: port
            });
        }
    }
    catch (err) {
    }
    return peers;
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
    return buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++] + '.' + buf[offset++];
}
