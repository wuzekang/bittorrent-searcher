"use strict";
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
var _this = this;
var bittorrent_1 = require("./lib/bittorrent");
var mongodb_1 = require("mongodb");
var parseTorrent = require("parse-torrent");
var path = require("path");
var koa = require("koa");
var cache = require("koa-static-cache");
var pug = require("pug");
var spider = new bittorrent_1.DHT();
spider.listen(6881);
spider.crawle();
var view = function (name, value) {
    var pieces = [__dirname, 'views'].concat(name.split('.')), file = path.join.apply(path, pieces) + '.pug';
    return pug.renderFile(file, value);
};
var _onMetadata = function (torrents) {
    return function (info_hash, metadata) { return __awaiter(_this, void 0, void 0, function () {
        var _id, _torrent, torrent, infoHash, name, files, length, pieceLength, lastPieceLength, pieces;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _id = info_hash;
                    return [4 /*yield*/, torrents.findOne({ _id: _id })];
                case 1:
                    _torrent = _a.sent(), torrent = metadata ? parseTorrent(metadata) : {}, infoHash = torrent.infoHash, name = torrent.name, files = torrent.files, length = torrent.length, pieceLength = torrent.pieceLength, lastPieceLength = torrent.lastPieceLength, pieces = torrent.pieces;
                    console.log(info_hash);
                    torrent = {
                        _id: _id,
                        infoHash: infoHash,
                        name: name,
                        files: files,
                        length: length,
                        downloads: 0
                    };
                    if (!_torrent) {
                        torrents.insert(torrent);
                    }
                    else if (_torrent.infoHash) {
                        torrents.update({ _id: _id }, { downloads: _torrent.downloads + 1 });
                    }
                    else {
                        torrents.update({ _id: _id }, _torrent);
                    }
                    return [2 /*return*/];
            }
        });
    }); };
};
var main = function () { return __awaiter(_this, void 0, void 0, function () {
    var _this = this;
    var url, db, Torrent, app;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = 'mongodb://localhost:27017/test';
                return [4 /*yield*/, mongodb_1.MongoClient.connect(url)];
            case 1:
                db = _a.sent(), Torrent = db.collection('torrents');
                spider.on('metadata', _onMetadata(Torrent));
                app = new koa();
                app.use(function (ctx, next) { return __awaiter(_this, void 0, void 0, function () {
                    var start, ms;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                start = new Date();
                                return [4 /*yield*/, next()];
                            case 1:
                                _a.sent();
                                ms = new Date().getUTCMinutes() - start.getUTCMinutes();
                                console.log(ctx.method + " " + ctx.url + " - " + ms + "ms");
                                return [2 /*return*/];
                        }
                    });
                }); });
                app.use(cache(path.join(__dirname, 'public')));
                app.use(function (ctx) { return __awaiter(_this, void 0, void 0, function () {
                    var query, search, page, limit, _search, _page, _limit, _query, _total, torrents, total, count, left, right, begin, end;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                query = ctx.request.query, search = query.search, page = query.page, limit = query.limit;
                                _search = search || '', _page = page && parseInt(page) && page > 0 ? parseInt(page) : 1, _limit = limit && parseInt(limit) && limit > 0 ? parseInt(limit) : 20, _query = { infoHash: { $ne: null } };
                                if (search)
                                    _query.$text = { $search: _search };
                                return [4 /*yield*/, Torrent.count(_query)];
                            case 1:
                                _total = _a.sent();
                                return [4 /*yield*/, Torrent.find(_query)
                                        .limit(_limit).skip(_limit * (_page - 1)).toArray()];
                            case 2:
                                torrents = _a.sent();
                                total = Math.ceil(_total / _limit), count = 10, left = Math.floor(count / 2), right = Math.ceil(count / 2);
                                begin = 1, end = total;
                                if (total > count) {
                                    begin = _page - left;
                                    end = _page + right - 1;
                                    if (begin < 1) {
                                        end += 1 - begin;
                                        begin = 1;
                                    }
                                    if (end > total) {
                                        begin += total - end;
                                        end = total;
                                    }
                                }
                                ctx.body = view('index', {
                                    torrents: torrents,
                                    search: _search,
                                    limit: _limit,
                                    pager: {
                                        begin: begin,
                                        end: end,
                                        current: _page,
                                        total: total
                                    }
                                });
                                return [2 /*return*/];
                        }
                    });
                }); });
                app.listen(3000);
                return [2 /*return*/];
        }
    });
}); };
main();
