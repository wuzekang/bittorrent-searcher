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
        step((generator = generator.apply(thisArg, _arguments)).next());
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
                            if (!(--retries < 0))
                                return [3 /*break*/, 1];
                            resolve(null);
                            return [3 /*break*/, 5];
                        case 1:
                            _a = peers;
                            if (_a)
                                return [3 /*break*/, 3];
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJpdHRvcnJlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5QkFBMkI7QUFDM0IsNkJBQStCO0FBQy9CLG1DQUFxQztBQUNyQyxpQ0FBc0M7QUFDdEMsa0NBQW9DO0FBQ3BDLGlDQUFvQztBQUVwQyw4Q0FBZ0Q7QUFDaEQseUNBQTJDO0FBRzNDLG1EQUFxQztBQThCckMsSUFBWSxRQUVYO0FBRkQsV0FBWSxRQUFRO0lBQ2hCLHVDQUFJLENBQUE7SUFBRSwyQ0FBTSxDQUFBO0lBQUUscUNBQUcsQ0FBQTtBQUNyQixDQUFDLEVBRlcsUUFBUSxHQUFSLGdCQUFRLEtBQVIsZ0JBQVEsUUFFbkI7QUFFRDtJQUEwQix3QkFBWTtJQVVsQztRQUFBLFlBQ0ksaUJBQU8sU0E0QlY7UUF0Q0QsaUJBQVcsR0FBRyxHQUFHLENBQUM7UUFFbEIsY0FBUSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFDckIsY0FBUSxHQUFHLElBQUksd0JBQUssRUFBbUIsQ0FBQztRQUV4QyxXQUFLLEdBQUcsQ0FBQyxDQUFDO1FBRVYsYUFBTyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFJakMsS0FBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQUMsSUFBSSxFQUFFLEtBQUs7WUFDbkMsSUFBSSxDQUFDO2dCQUNELElBQUksT0FBTyxHQUFZLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQ3ZDLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM3QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFDL0IsS0FBSyxHQUFHLEtBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNuQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7d0JBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3BELENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNyQixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFDL0IsS0FBSyxHQUFTO3dCQUNWLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTt3QkFDNUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3dCQUNmLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFDO3dCQUM3QyxRQUFRLEVBQUUsS0FBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDO3FCQUMzQyxDQUFDO29CQUVOLEtBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUM5QixDQUFDO1lBQ0wsQ0FBRTtZQUFBLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFFakIsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQUEsR0FBRztRQUU1QixDQUFDLENBQUMsQ0FBQTs7SUFDTixDQUFDO0lBRUQsd0JBQVMsR0FBVCxVQUFVLE9BQU8sRUFBRSxLQUFLO1FBQXhCLGlCQVdDO1FBVkcsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxVQUFNLElBQUk7Z0JBRVQsT0FBTzs7OzRCQURKLE1BQU0sZUFBQSxJQUFJLEVBQUE7O3dCQUFqQixJQUFJLFlBQWEsQ0FBQztrQ0FDSjs0QkFDVixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7NEJBQ2IsQ0FBQyxFQUFFLEdBQUc7NEJBQ04sQ0FBQyxFQUFFLElBQUk7eUJBQ1Y7d0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzs7OzthQUN6RSxDQUFBO0lBQ0wsQ0FBQztJQUVELDBCQUFXLEdBQVg7UUFBQSxpQkFtQ0M7O1lBaENPLElBQUksS0FBSyxHQUFHLE9BQUssUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRTNCLElBQUEscUJBQU0sRUFBRSxpQkFBSSxFQUFFLGlCQUFJLEVBQUUseUJBQVEsQ0FBVTtZQUUzQyxJQUFJLEdBQUcsR0FBRyxPQUFLLEtBQUssRUFBRyxDQUFDO1lBRXhCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUM7Z0JBQUMsT0FBSyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBRWxDLElBQUksT0FBTyxHQUFZO2dCQUNuQixDQUFDLEVBQUUsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixDQUFDLEVBQUUsR0FBRztnQkFDTixDQUFDLEVBQUUsTUFBTTthQUNaLENBQUM7WUFFRixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7WUFFM0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWhDLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBQyxJQUFJLEVBQUUsS0FBSztnQkFDekIsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDMUIsS0FBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFCLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3RCLEtBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixDQUFDLENBQUE7WUFFRCxLQUFLLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQztnQkFDckIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRVQsT0FBSyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM5QixPQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRSxDQUFDOztRQWhDRCxPQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXOztTQWdDakU7SUFDTCxDQUFDO0lBRUQsb0JBQUssR0FBTCxVQUFNLElBQVUsRUFBRSxNQUFNLEVBQUUsSUFBVyxFQUFFLFFBQTBCO1FBQWpFLGlCQW9CQztRQXBCeUIscUJBQUEsRUFBQSxXQUFXO1FBQUUseUJBQUEsRUFBQSxXQUFXLFFBQVEsQ0FBQyxNQUFNO1FBRTdELE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBRS9CLElBQUksUUFBUSxHQUFHLFVBQUMsSUFBSSxFQUFFLEtBQUs7Z0JBQ3ZCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ1AsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzt3QkFDWCxJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ3hDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxJQUFJLFdBQVcsQ0FBQzt3QkFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMvQyxDQUFDO2dCQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixDQUFDLENBQUM7WUFHRixLQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzRixLQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFdkIsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRUwsV0FBQztBQUFELENBakhBLEFBaUhDLENBakh5QixxQkFBWSxHQWlIckM7QUFqSFksb0JBQUk7QUFvSGpCO0lBQXlCLHVCQUFZO0lBY2pDO1FBQUEsWUFDSSxpQkFBTyxTQTRCVjtRQXpDRCxRQUFFLEdBQUcsb0JBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyQixPQUFDLEdBQUcsRUFBRSxDQUFDO1FBUVAsV0FBSyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDbkIsWUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBSTNDLEtBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFNLEtBQUs7Z0JBQ3pCLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFDN0IsRUFBRSxNQWNPLElBQUksRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUU5QixRQUFROzs7OytCQWpCaUIsS0FBSyxnQkFBTCxLQUFLLGdCQUFMLEtBQUssa0JBQUwsS0FBSzs2QkFDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7d0JBRXRCLEtBQUEsTUFBTSxDQUFBOztpQ0FDTCxNQUFNLEVBQU4sTUFBTSxrQkFBQTtpQ0FHTixXQUFXLEVBQVgsTUFBTSxrQkFBSztpQ0FHWCxXQUFXLEVBQVgsTUFBTSxrQkFBSztpQ0FHWCxlQUFlLEVBQWYsTUFBTSxrQkFBUzs7Ozt3QkFSaEIsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7d0JBQ3BCLE1BQU0sa0JBQUE7O3dCQUVOLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ2hDLE1BQU0sa0JBQUE7O3dCQUVOLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQzt3QkFDbkQsTUFBTSxrQkFBQTs7d0JBRU4sUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7K0JBQ2lCLElBQUksc0JBQUosSUFBSSwyQkFBSixJQUFJO3dCQUMxQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsWUFBWSxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLE1BQU0sR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQzt3QkFDM0QsTUFBTSxlQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQTs7O3dCQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDakUsTUFBTSxrQkFBQTs0QkFFTixNQUFNLGtCQUFBOzs7O2FBSWpCLENBQUMsQ0FBQTs7SUFDTixDQUFDO0lBRUQsd0JBQVUsR0FBVixVQUFXLElBQUk7UUFDWCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNWLElBQUksRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3QixHQUFHLENBQUEsQ0FBQyxJQUFJLENBQUMsR0FBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN0QixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkIsS0FBSyxDQUFDO2dCQUNWLENBQUM7WUFDTCxDQUFDO1lBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsb0JBQU0sR0FBTixVQUFPLElBQVksRUFBRSxPQUFlLEVBQUUsUUFBcUI7UUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELG9CQUFNLEdBQU4sVUFBTyxNQUFNLEVBQUUsS0FBMEM7UUFBekQsaUJBbUNDO1FBbkNjLHNCQUFBLEVBQUEsWUFBWSxPQUFPLENBQUMsRUFBQyxXQUFXLEVBQUUsTUFBTSxFQUFDLENBQUM7UUFDckQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUMsUUFBUSxFQUFFLE9BQU87WUFDL0IsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFyQixDQUFxQixDQUFDLENBQUM7WUFDaEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQU0sT0FBTyxHQUFHO1lBQ1osTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLE1BQU07a0JBQzNDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUksQ0FBQyxDQUFDLENBQUM7a0JBQzdCLEdBQUcsQ0FBQyxlQUFlLENBQUM7UUFDOUIsQ0FBQyxDQUFBO1FBRUQsSUFBTSxPQUFPLEdBQUc7WUFDWixNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQyxJQUFJO2dCQUNsQyxNQUFNLENBQUMsS0FBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFDLEVBQUUsRUFBRSxLQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO1lBQy9GLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDUixDQUFDLENBQUE7UUFFRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPO1lBQ3ZCLElBQU0sSUFBSSxHQUFHO29CQUNMLE9BQU8sRUFDUCxLQUFLOzs7Z0NBRFksTUFBTSxlQUFBLE9BQU8sRUFBRSxFQUFBOzt5REFDeEIsRUFBRTs0QkFDZCxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsTUFBTSxFQUFOLENBQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLE1BQU07Z0NBQ3RDLElBQUEsb0JBQUssRUFBRSxzQkFBTSxDQUFXO2dDQUM3QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7b0NBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQWYsQ0FBZSxDQUFDLENBQUM7Z0NBQ2xELEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzs0QkFDN0MsQ0FBQyxDQUFDLENBQUE7NEJBQ0YsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNwQixJQUFJLEVBQUUsQ0FBQzs0QkFDWCxDQUFDOzRCQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNKLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzs0QkFDbkIsQ0FBQzs7OztpQkFDSixDQUFDO1lBQ0YsSUFBSSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFRCxzQkFBUSxHQUFSLFVBQVMsTUFBTSxFQUFFLEtBQVk7UUFBN0IsaUJBd0RDO1FBeERnQixzQkFBQSxFQUFBLFlBQVk7UUFDekIsSUFBSSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsRUFBQyxXQUFXLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztRQUMvQyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFFaEIsSUFBTSxLQUFLLEdBQUcsVUFBQyxLQUFLO1lBQ2hCLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJO2dCQUN6QixNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPO29CQUN2QixJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRTt3QkFFM0MsSUFBSSxJQUFJLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQzt3QkFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQy9CLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQzt3QkFFeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUVoQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsVUFBQyxRQUFROzRCQUNyQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3RCLENBQUMsQ0FBQyxDQUFBO3dCQUVGLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFOzRCQUNqQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUM3QixDQUFDLENBQUMsQ0FBQTtvQkFDTixDQUFDLENBQUMsQ0FBQTtvQkFFRixVQUFVLENBQUM7d0JBQ1AsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2xCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFFVCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFBLEdBQUc7d0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbEIsQ0FBQyxDQUFDLENBQUE7Z0JBQ04sQ0FBQyxDQUFDLENBQUE7WUFDTixDQUFDLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE9BQU87Z0JBQ3JDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxJQUFJLElBQUksRUFBYixDQUFhLENBQUMsSUFBSSxJQUFJLENBQUM7WUFDeEQsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUE7UUFFRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPO1lBQ3ZCLElBQUksSUFBSSxHQUFHO29CQUlDLE1BQU0sRUFDTixRQUFROzs7O2lDQUpaLENBQUEsRUFBRyxPQUFPLEdBQUcsQ0FBQyxDQUFBOzs0QkFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Ozs0QkFFRCxLQUFBLEtBQUssQ0FBQTs7Z0NBQUwsTUFBTSxrQkFBRDs0QkFBSSxNQUFNLGVBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUE7Ozs7Ozs0QkFDdkMsTUFBTSxlQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBQTs7OzRCQUNsQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dDQUNYLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQzs0QkFDdEIsQ0FBQzs0QkFBQyxJQUFJLENBQUMsQ0FBQztnQ0FDSixLQUFLLEdBQUcsSUFBSSxDQUFDO2dDQUNiLElBQUksRUFBRSxDQUFDOzRCQUNYLENBQUM7Ozs7O2lCQUVSLENBQUE7WUFDRCxJQUFJLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELG9CQUFNLEdBQU4sVUFBTyxXQUFpQjtRQUF4QixpQkErQkM7UUEvQk0sNEJBQUEsRUFBQSxpQkFBaUI7UUFFcEIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxFQUFFLENBQUM7UUFFNUIsSUFBTSxLQUFLLEdBQUcsVUFBQyxJQUFJO1lBRWYsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO2dCQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFekQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDeEMsRUFBRyxPQUFPLENBQUM7Z0JBQ1gsSUFBSSxNQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUNwQixFQUFFLEdBQUcsS0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFJLENBQUMsQ0FBQztnQkFFL0IsS0FBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLG9CQUFXLENBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BHLENBQUM7UUFFTCxDQUFDLENBQUE7UUFFRCxJQUFNLElBQUksR0FBRyxVQUFDLElBQUk7WUFDZCxFQUFHLE9BQU8sQ0FBQztZQUVYLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0IsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQixDQUFDO1FBRUwsQ0FBQyxDQUFBO1FBRUQsR0FBRyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFdEMsQ0FBQztJQUVMLFVBQUM7QUFBRCxDQS9MQSxBQStMQyxDQS9Md0IscUJBQVk7QUFLMUIsbUJBQWUsR0FBZ0I7SUFDbEMsRUFBRSxJQUFJLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUM3QyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzNDLEVBQUUsSUFBSSxFQUFFLHdCQUF3QixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7Q0FDakQsQ0FBQTtBQVRRLGtCQUFHO0FBaU1oQixxQkFBc0IsR0FBRztJQUN2QixJQUFJLEtBQUssR0FBRyxFQUFFLENBQUE7SUFFZCxJQUFJLENBQUM7UUFDSCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwQyxJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUFDLFFBQVEsQ0FBQTtZQUNuQixLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNULElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEIsSUFBSSxFQUFFLElBQUk7YUFDWCxDQUFDLENBQUE7UUFDSixDQUFDO0lBQ0gsQ0FBRTtJQUFBLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFZixDQUFDO0lBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQTtBQUNkLENBQUM7QUFFRCxvQkFBb0IsR0FBRztJQUNuQixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUE7SUFFakIsSUFBSSxDQUFDO1FBQ0QsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUN0QyxJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtZQUNuQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFBQyxRQUFRLENBQUE7WUFDbkIsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDVixFQUFFLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxFQUFFLElBQUk7YUFDYixDQUFDLENBQUE7UUFDTixDQUFDO0lBQ0wsQ0FBRTtJQUFBLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFZixDQUFDO0lBQ0QsTUFBTSxDQUFDLFFBQVEsQ0FBQTtBQUNuQixDQUFDO0FBRUQsaUJBQWlCLEdBQUcsRUFBRSxNQUFNO0lBQ3hCLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtBQUMxRixDQUFDIiwiZmlsZSI6ImJpdHRvcnJlbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCAqIGFzIGRncmFtIGZyb20gJ2RncmFtJztcbmltcG9ydCAqIGFzIGJlbmNvZGUgZnJvbSAnLi9iZW5jb2RlJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgKiBhcyBLQnVja2V0IGZyb20gJ2stYnVja2V0JztcbmltcG9ydCB7IHJhbmRvbUJ5dGVzIH0gZnJvbSAnY3J5cHRvJ1xuXG5pbXBvcnQgKiBhcyBQcm90b2NvbCBmcm9tICdiaXR0b3JyZW50LXByb3RvY29sJztcbmltcG9ydCAqIGFzIHV0X21ldGFkYXRhIGZyb20gJ3V0X21ldGFkYXRhJztcbmltcG9ydCAqIGFzIHBhcnNlVG9ycmVudCBmcm9tICdwYXJzZS10b3JyZW50JztcblxuaW1wb3J0IFF1ZXVlIGZyb20gJy4vcHJpb3JpdHktcXVldWUnO1xuLy85MDI4OWZkMzRkZmMxY2Y4ZjMxNmEyNjhhZGQ4MzU0Yzg1MzM0NDU4XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzc2FnZSB7XG4gICAgdDogQnVmZmVyLFxuICAgIHk6IFN0cmluZyxcbiAgICBxOiBTdHJpbmcsXG4gICAgYT86IGFueVxuICAgIGU/OiBhbnksXG4gICAgcj86IGFueVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlZXIge1xuICAgIGhvc3Q6IHN0cmluZyxcbiAgICBwb3J0OiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOb2RlIGV4dGVuZHMgUGVlciB7XG4gICAgaWQ6IEJ1ZmZlcixcbiAgICB0b2tlbj86IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFF1ZXJ5IHtcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBkYXRhOiBhbnksXG4gICAgcGVlcjogUGVlcixcbiAgICByZXNwb25zZTogRnVuY3Rpb24sXG4gICAgdGltZXI/OiBOb2RlSlMuVGltZXJcbn1cblxuZXhwb3J0IGVudW0gUHJpb3JpdHkge1xuICAgIEhpZ2gsIE1lZGl1bSwgTG93XG59XG5cbmV4cG9ydCBjbGFzcyBLUlBDIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25jdXJyZW5jeSA9IDEwMDtcblxuICAgIF9ydW5uaW5nID0gbmV3IE1hcCgpO1xuICAgIF9wZW5kaW5nID0gbmV3IFF1ZXVlPFByaW9yaXR5LCBRdWVyeT4oKTtcbiAgICBcbiAgICBfdGljayA9IDA7XG5cbiAgICBfc29ja2V0ID0gZGdyYW0uY3JlYXRlU29ja2V0KCd1ZHA0Jyk7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fc29ja2V0Lm9uKCdtZXNzYWdlJywgKGRhdGEsIHJpbmZvKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlOiBNZXNzYWdlID0gYmVuY29kZS5kZWNvZGUoZGF0YSksXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSBtZXNzYWdlLnkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PSAncicgfHwgdHlwZSA9PSAnZScpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRpZCA9IG1lc3NhZ2UudC5yZWFkVUludDE2QkUoMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeSA9IHRoaXMuX3J1bm5pbmcuZ2V0KHRpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeSkgcXVlcnkucmVzcG9uc2UobWVzc2FnZVt0eXBlXSwgcmluZm8pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PSAncScpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRpZCA9IG1lc3NhZ2UudC5yZWFkVUludDE2QkUoMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeSA6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IG1lc3NhZ2UucS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IG1lc3NhZ2UuYSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWVyOiB7aG9zdDogcmluZm8uYWRkcmVzcywgcG9ydDogcmluZm8ucG9ydH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2U6IHRoaXMuX3Jlc3BvbnNlKG1lc3NhZ2UsIHJpbmZvKVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ3F1ZXJ5JywgcXVlcnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5fc29ja2V0Lm9uKCdlcnJvcicsIGVyciA9PiB7XG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBfcmVzcG9uc2UobWVzc2FnZSwgcmluZm8pIHtcbiAgICAgICAgbGV0IF9tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgICAgcmV0dXJuIGFzeW5jIGRhdGEgPT4gIHtcbiAgICAgICAgICAgIGRhdGEgPSBhd2FpdCBkYXRhO1xuICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgdDogX21lc3NhZ2UudCxcbiAgICAgICAgICAgICAgICB5OiAncicsXG4gICAgICAgICAgICAgICAgcjogZGF0YVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fc29ja2V0LnNlbmQoYmVuY29kZS5lbmNvZGUobWVzc2FnZSksIHJpbmZvLnBvcnQsIHJpbmZvLmFkZHJlc3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX3J1blF1ZXJpZXMoKSB7XG4gICAgICAgIFxuICAgICAgICB3aGlsZSh0aGlzLl9wZW5kaW5nLnNpemUgJiYgIHRoaXMuX3J1bm5pbmcuc2l6ZSA8IHRoaXMuY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgIGxldCBxdWVyeSA9IHRoaXMuX3BlbmRpbmcucG9wKCk7XG5cbiAgICAgICAgICAgIGxldCB7bWV0aG9kLCBkYXRhLCBwZWVyLCByZXNwb25zZX0gPSBxdWVyeTtcblxuICAgICAgICAgICAgbGV0IHRpZCA9IHRoaXMuX3RpY2sgKys7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aWQgPj0gMHhGRkZGKSB0aGlzLl90aWNrID0gMDtcblxuICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IE1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgdDogbmV3IEJ1ZmZlcigyKSxcbiAgICAgICAgICAgICAgICB5OiAncScsXG4gICAgICAgICAgICAgICAgcTogbWV0aG9kLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGRhdGEpIG1lc3NhZ2UuYSA9IGRhdGE7XG5cbiAgICAgICAgICAgIG1lc3NhZ2UudC53cml0ZVVJbnQxNkJFKHRpZCwgMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHF1ZXJ5LnJlc3BvbnNlID0gKGRhdGEsIHJpbmZvKSA9PiB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHF1ZXJ5LnRpbWVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ydW5uaW5nLmRlbGV0ZSh0aWQpO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlKGRhdGEsIHJpbmZvKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ydW5RdWVyaWVzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHF1ZXJ5LnRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgcXVlcnkucmVzcG9uc2UobnVsbCwgbnVsbCk7XG4gICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5fcnVubmluZy5zZXQodGlkLCBxdWVyeSk7XG4gICAgICAgICAgICB0aGlzLl9zb2NrZXQuc2VuZChiZW5jb2RlLmVuY29kZShtZXNzYWdlKSwgcGVlci5wb3J0LCBwZWVyLmhvc3QpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcXVlcnkocGVlcjogUGVlciwgbWV0aG9kLCBkYXRhID0gbnVsbCwgcHJpb3JpdHkgPSBQcmlvcml0eS5NZWRpdW0pIHtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSAoZGF0YSwgcmluZm8pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5ub2RlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubm9kZXMgPSBwYXJzZU5vZGVzKGRhdGEubm9kZXMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS52YWx1ZXMgJiYgbWV0aG9kID09ICdnZXRfcGVlcnMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS52YWx1ZXMgPSBkZWNvZGVQZWVycyhkYXRhLnZhbHVlcyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgdGhpcy5fcGVuZGluZy5wdXNoKHttZXRob2Q6IG1ldGhvZCwgZGF0YTogZGF0YSwgcGVlcjogcGVlciwgcmVzcG9uc2U6IHJlc3BvbnNlfSwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgdGhpcy5fcnVuUXVlcmllcygpO1xuXG4gICAgICAgIH0pXG4gICAgfVxuXG59XG5cblxuZXhwb3J0IGNsYXNzIERIVCBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG5cbiAgICBpZCA9IHJhbmRvbUJ5dGVzKDIwKTtcbiAgICBLID0gMjA7XG5cbiAgICBzdGF0aWMgQk9PVFNUUkFQX05PREVTOiBBcnJheTxQZWVyPiA9IFtcbiAgICAgICAgeyBob3N0OiAncm91dGVyLmJpdHRvcnJlbnQuY29tJywgcG9ydDogNjg4MSB9LFxuICAgICAgICB7IGhvc3Q6ICdyb3V0ZXIudXRvcnJlbnQuY29tJywgcG9ydDogNjg4MSB9LFxuICAgICAgICB7IGhvc3Q6ICdkaHQudHJhbnNtaXNzaW9uYnQuY29tJywgcG9ydDogNjg4MSB9XG4gICAgXVxuXG4gICAgX2tycGMgPSBuZXcgS1JQQygpO1xuICAgIF90YWJsZSA9IG5ldyBLQnVja2V0KHsgbG9jYWxOb2RlSWQ6IHRoaXMuaWQgfSk7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fa3JwYy5vbigncXVlcnknLCBhc3luYyBxdWVyeSA9PiB7XG4gICAgICAgICAgICBsZXQge3BlZXIsIG1ldGhvZCwgZGF0YSwgcmVzcG9uc2V9ID0gcXVlcnk7XG4gICAgICAgICAgICBsZXQgaWQgPSB0aGlzLl9jbG9zZXN0SUQoZGF0YSk7XG5cbiAgICAgICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAncGluZyc6XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlKHsgaWQ6IGlkIH0pXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbmRfbm9kZSc6XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlKHsgaWQ6IGlkLCBub2RlczogJycgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9wZWVycyc6XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlKHsgaWQ6IGlkLCBub2RlczogJycsIHRva2VuOiAnVEFPQktDRU4nIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdhbm5vdW5jZV9wZWVyJzpcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UoeyBpZDogaWQgfSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB7cG9ydCwgaW1wbGllZF9wb3J0LCBpbmZvX2hhc2h9ID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgcGVlci5wb3J0ID0gIWltcGxpZWRfcG9ydCAmJiBwb3J0ID4gMCAmJiBwb3J0IDwgMHhGRkZGID8gcG9ydCA6IHBlZXIucG9ydDtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1ldGFkYXRhID0gYXdhaXQgdGhpcy5tZXRhZGF0YShpbmZvX2hhc2gsIFtwZWVyXSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnbWV0YWRhdGEnLCBpbmZvX2hhc2gudG9TdHJpbmcoJ2hleCcpLCBtZXRhZGF0YSwgcGVlcik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBfY2xvc2VzdElEKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUuaWQpIHtcbiAgICAgICAgICAgIGxldCBpZCA9IG5ldyBCdWZmZXIobm9kZS5pZCk7XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAgaWQubGVuZ3RoOyBpID49IDA7IC0taSkge1xuICAgICAgICAgICAgICAgIGlmIChpZFtpXSAhPSB0aGlzLmlkW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGlkW2ldID0gdGhpcy5pZFtpXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmlkO1xuICAgIH1cbiAgICBcbiAgICBsaXN0ZW4ocG9ydD86bnVtYmVyLCBhZGRyZXNzPzpzdHJpbmcsIGNhbGxiYWNrPzogKCkgPT4gdm9pZCkgOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fa3JwYy5fc29ja2V0LmJpbmQocG9ydCwgYWRkcmVzcywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGxvb2t1cCh0YXJnZXQsIHRhYmxlID0gbmV3IEtCdWNrZXQoe2xvY2FsTm9kZUlkOiB0YXJnZXR9KSkge1xuICAgICAgICB0YWJsZS5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3BpbmcnKTtcbiAgICAgICAgdGFibGUub24oJ3BpbmcnLCAob2xkTm9kZXMsIG5ld05vZGUpID0+IHtcbiAgICAgICAgICAgIG9sZE5vZGVzLmZvckVhY2gobm9kZSA9PiB0YWJsZS5yZW1vdmUobm9kZS5pZCkpO1xuICAgICAgICAgICAgdGFibGUuYWRkKG5ld05vZGUpO1xuICAgICAgICB9KVxuICAgICAgICBjb25zdCBjbG9zZXN0ID0gKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRhYmxlLmNvdW50KCkgPiBESFQuQk9PVFNUUkFQX05PREVTLmxlbmd0aFxuICAgICAgICAgICAgICAgID8gdGFibGUuY2xvc2VzdCh0YXJnZXQsIHRoaXMuSylcbiAgICAgICAgICAgICAgICA6IERIVC5CT09UU1RSQVBfTk9ERVM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBxdWVyaWVzID0gKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGNsb3Nlc3QoKS5tYXAoKHBlZXIpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fa3JwYy5xdWVyeShwZWVyLCAnZ2V0X3BlZXJzJywge2lkOiB0aGlzLl9jbG9zZXN0SUQocGVlciksIGluZm9faGFzaDogdGFyZ2V0fSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdHMgOiBhbnkgID0gYXdhaXQgcXVlcmllcygpLFxuICAgICAgICAgICAgICAgICAgICBwZWVycyA9IFtdO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMuZmlsdGVyKHJlc3VsdCA9PiByZXN1bHQpLmZvckVhY2gocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHtub2RlcywgdmFsdWVzfSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGVzKSBub2Rlcy5mb3JFYWNoKG5vZGUgPT4gdGFibGUuYWRkKG5vZGUpKTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZXMpIHBlZXJzID0gcGVlcnMuY29uY2F0KHZhbHVlcyk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBpZiAocGVlcnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocGVlcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgbWV0YWRhdGEodGFyZ2V0LCBwZWVycyA9IG51bGwpIHtcbiAgICAgICAgbGV0IHRhYmxlID0gbmV3IEtCdWNrZXQoe2xvY2FsTm9kZUlkOiB0YXJnZXR9KTtcbiAgICAgICAgbGV0IHJldHJpZXMgPSA4O1xuXG4gICAgICAgIGNvbnN0IGZldGNoID0gKHBlZXJzKSA9PiB7XG4gICAgICAgICAgICBsZXQgcHJvbWlzZXMgPSBwZWVycy5tYXAocGVlciA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzb2NrZXQgPSBuZXQuY29ubmVjdChwZWVyLnBvcnQsIHBlZXIuaG9zdCwgKCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgd2lyZSA9IG5ldyBQcm90b2NvbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ja2V0LnBpcGUod2lyZSkucGlwZShzb2NrZXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lyZS51c2UodXRfbWV0YWRhdGEoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpcmUuaGFuZHNoYWtlKHRhcmdldCwgdGhpcy5pZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHdpcmUudXRfbWV0YWRhdGEub24oJ21ldGFkYXRhJywgKG1ldGFkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtZXRhZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB3aXJlLm9uKCdoYW5kc2hha2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lyZS51dF9tZXRhZGF0YS5mZXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9LCA1MDAwKTtcblxuICAgICAgICAgICAgICAgICAgICBzb2NrZXQub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4ocmVzdWx0cyA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHMuZmluZCh2YWx1ZSA9PiB2YWx1ZSAhPSBudWxsKSB8fCBudWxsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGxldCBuZXh0ID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgtLSByZXRyaWVzIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBfcGVlcnMgPSBwZWVycyB8fCBhd2FpdCB0aGlzLmxvb2t1cCh0YXJnZXQsIHRhYmxlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhID0gYXdhaXQgZmV0Y2goX3BlZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGFkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1ldGFkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZXJzID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBjcmF3bGUoY29uY3VycmVuY3kgPSAyMDApIHtcblxuICAgICAgICBsZXQgcnVubmluZyA9IDAsIGNhY2hlID0gW107XG5cbiAgICAgICAgY29uc3QgcXVlcnkgPSAobm9kZSkgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobm9kZSAmJiBjYWNoZS5sZW5ndGggPCBjb25jdXJyZW5jeSkgY2FjaGUucHVzaChub2RlKTtcblxuICAgICAgICAgICAgaWYgKGNhY2hlLmxlbmd0aCAmJiBydW5uaW5nIDwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICArKyBydW5uaW5nO1xuICAgICAgICAgICAgICAgIGxldCBub2RlID0gY2FjaGUuc2hpZnQoKSxcbiAgICAgICAgICAgICAgICAgICAgaWQgPSB0aGlzLl9jbG9zZXN0SUQobm9kZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5fa3JwYy5xdWVyeShub2RlLCAnZmluZF9ub2RlJywge2lkOiBpZCwgdGFyZ2V0OiByYW5kb21CeXRlcygyMCl9LCBQcmlvcml0eS5Mb3cpLnRoZW4obmV4dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5leHQgPSAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgLS0gcnVubmluZztcblxuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5ub2RlcyAmJiBkYXRhLm5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRhdGEubm9kZXMuZm9yRWFjaChxdWVyeSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVlcnkobnVsbCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIERIVC5CT09UU1RSQVBfTk9ERVMuZm9yRWFjaChxdWVyeSlcblxuICAgIH1cblxufVxuXG5mdW5jdGlvbiBkZWNvZGVQZWVycyAoYnVmKSB7XG4gIHZhciBwZWVycyA9IFtdXG5cbiAgdHJ5IHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1Zi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHBvcnQgPSBidWZbaV0ucmVhZFVJbnQxNkJFKDQpXG4gICAgICBpZiAoIXBvcnQpIGNvbnRpbnVlXG4gICAgICBwZWVycy5wdXNoKHtcbiAgICAgICAgaG9zdDogcGFyc2VJcChidWZbaV0sIDApLFxuICAgICAgICBwb3J0OiBwb3J0XG4gICAgICB9KVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gZG8gbm90aGluZ1xuICB9XG5cbiAgcmV0dXJuIHBlZXJzXG59XG5cbmZ1bmN0aW9uIHBhcnNlTm9kZXMoYnVmKSB7XG4gICAgdmFyIGNvbnRhY3RzID0gW11cblxuICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmLmxlbmd0aDsgaSArPSAyNikge1xuICAgICAgICAgICAgdmFyIHBvcnQgPSBidWYucmVhZFVJbnQxNkJFKGkgKyAyNClcbiAgICAgICAgICAgIGlmICghcG9ydCkgY29udGludWVcbiAgICAgICAgICAgIGNvbnRhY3RzLnB1c2goe1xuICAgICAgICAgICAgICAgIGlkOiBidWYuc2xpY2UoaSwgaSArIDIwKSxcbiAgICAgICAgICAgICAgICBob3N0OiBwYXJzZUlwKGJ1ZiwgaSArIDIwKSxcbiAgICAgICAgICAgICAgICBwb3J0OiBwb3J0XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIFxuICAgIH1cbiAgICByZXR1cm4gY29udGFjdHNcbn1cblxuZnVuY3Rpb24gcGFyc2VJcChidWYsIG9mZnNldCkge1xuICAgIHJldHVybiBidWZbb2Zmc2V0KytdICsgJy4nICsgYnVmW29mZnNldCsrXSArICcuJyArIGJ1ZltvZmZzZXQrK10gKyAnLicgKyBidWZbb2Zmc2V0KytdXG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
