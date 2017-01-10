"use strict";
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
var _this = this;
var Net = require("net");
var Koa = require("koa");
var DHT = require("bittorrent-dht");
var Protocol = require("bittorrent-protocol");
var fs_1 = require("fs");
var mongodb_1 = require("mongodb");
var ut_metadata = require("ut_metadata");
var main = function () { return __awaiter(_this, void 0, void 0, function () {
    var _this = this;
    var url, db, crawlers, spider, i, crawler, app;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = 'mongodb://localhost:27017/test';
                return [4 /*yield*/, mongodb_1.MongoClient.connect(url)];
            case 1:
                db = _a.sent();
                crawlers = [], spider = new DHT();
                for (i = 0; i < 1024; i++) {
                    crawler = new DHT();
                    crawler.on('announce', function (peer, infoHash, from) {
                        var socket = Net.connect(peer.port, peer.host, function () {
                            var wire = new Protocol();
                            socket.pipe(wire).pipe(socket);
                            wire.use(ut_metadata());
                            wire.handshake(infoHash, spider.nodeId);
                            wire.ut_metadata.on('metadata', function (metadata) {
                                fs_1.writeFile(infoHash.toString('hex'), metadata);
                                console.log(infoHash);
                            });
                            wire.on('handshake', function (infoHash, peerId) {
                                wire.ut_metadata.fetch();
                            });
                        });
                        socket.on('error', function (err) {
                        });
                    });
                    crawler.nodes.on('added', function (node) {
                    });
                    crawlers.push(crawler);
                }
                spider.on('peer', function (peer, infoHash, from) {
                });
                app = new Koa();
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
                app.use(function (ctx) { return __awaiter(_this, void 0, void 0, function () {
                    var coll, _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                coll = db.collection('torrents');
                                _a = ctx;
                                _b = 'Hello, Wrold!';
                                return [4 /*yield*/, coll.count({})];
                            case 1:
                                _a.body = _b + (_c.sent());
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

//# sourceMappingURL=data:application/json;base64,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Qzs7OztxQkFFckQsQ0FBQyxDQUFDO2dCQUVILEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBTSxHQUFHO3dCQUNULElBQUk7Ozs7dUNBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7Z0NBQ3BDLEtBQUEsR0FBRyxDQUFBO2dDQUFRLEtBQUEsZUFBZSxDQUFBO2dDQUFHLE1BQU0sZUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFBOztnQ0FBakQsR0FBSSxJQUFJLEdBQUcsZ0JBQXNDLENBQUM7Ozs7cUJBQ3JELENBQUMsQ0FBQztnQkFHSCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7O0tBQ3BCLENBQUE7QUFHRCxJQUFJLEVBQUUsQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxyXG5pbXBvcnQgKiBhcyBOZXQgZnJvbSAnbmV0JztcclxuaW1wb3J0ICogYXMgS29hIGZyb20gJ2tvYSc7XHJcbmltcG9ydCAqIGFzIERIVCBmcm9tICdiaXR0b3JyZW50LWRodCc7XHJcbmltcG9ydCAqIGFzIFByb3RvY29sIGZyb20gJ2JpdHRvcnJlbnQtcHJvdG9jb2wnO1xyXG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICdmcyc7XHJcbmltcG9ydCB7IE1vbmdvQ2xpZW50LCBEYiB9IGZyb20gJ21vbmdvZGInXHJcblxyXG5pbXBvcnQgKiBhcyBwYXJzZVRvcnJlbnQgZnJvbSAncGFyc2UtdG9ycmVudCc7XHJcbmltcG9ydCAqIGFzIHV0X21ldGFkYXRhIGZyb20gJ3V0X21ldGFkYXRhJztcclxuXHJcbmNvbnN0IG1haW4gPSBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCB1cmwgPSAnbW9uZ29kYjovL2xvY2FsaG9zdDoyNzAxNy90ZXN0JyxcclxuICAgICAgICBkYiA9IGF3YWl0IE1vbmdvQ2xpZW50LmNvbm5lY3QodXJsKTtcclxuXHJcbiAgICBsZXQgY3Jhd2xlcnMgPSBbXSxcclxuICAgICAgICBzcGlkZXIgPSBuZXcgREhUKCk7XHJcbiAgICBcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTAyNDsgaSsrKSB7XHJcbiAgICAgICAgbGV0IGNyYXdsZXIgPSBuZXcgREhUKCk7XHJcblxyXG4gICAgICAgIGNyYXdsZXIub24oJ2Fubm91bmNlJywgKHBlZXIsIGluZm9IYXNoLCBmcm9tKSA9PiB7XHJcblxyXG4gICAgICAgICAgICBsZXQgc29ja2V0ID0gTmV0LmNvbm5lY3QocGVlci5wb3J0LCBwZWVyLmhvc3QsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgbGV0IHdpcmUgPSBuZXcgUHJvdG9jb2woKTtcclxuICAgICAgICAgICAgICAgIHNvY2tldC5waXBlKHdpcmUpLnBpcGUoc29ja2V0KTtcclxuICAgICAgICAgICAgICAgIHdpcmUudXNlKHV0X21ldGFkYXRhKCkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB3aXJlLmhhbmRzaGFrZShpbmZvSGFzaCwgc3BpZGVyLm5vZGVJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgd2lyZS51dF9tZXRhZGF0YS5vbignbWV0YWRhdGEnLCAobWV0YWRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGUoaW5mb0hhc2gudG9TdHJpbmcoJ2hleCcpLCBtZXRhZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coaW5mb0hhc2gpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICB3aXJlLm9uKCdoYW5kc2hha2UnLCAoaW5mb0hhc2gsIHBlZXJJZCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpcmUudXRfbWV0YWRhdGEuZmV0Y2goKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBzb2NrZXQub24oJ2Vycm9yJywgZXJyID0+IHtcclxuXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgY3Jhd2xlci5ub2Rlcy5vbignYWRkZWQnLCBub2RlID0+IHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgY3Jhd2xlcnMucHVzaChjcmF3bGVyKTtcclxuICAgIH1cclxuXHJcbiAgICBzcGlkZXIub24oJ3BlZXInLCAocGVlciwgaW5mb0hhc2gsIGZyb20pID0+IHtcclxuXHJcbiAgICB9KVxyXG4gICAgXHJcblxyXG5cclxuICAgIGNvbnN0IGFwcCA9IG5ldyBLb2EoKTtcclxuXHJcblxyXG4gICAgYXBwLnVzZShhc3luYyAoY3R4LCBuZXh0KSA9PiB7XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIGF3YWl0IG5leHQoKTtcclxuICAgICAgICB2YXIgbXMgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbnV0ZXMoKSAtIHN0YXJ0LmdldFVUQ01pbnV0ZXMoKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgJHtjdHgubWV0aG9kfSAke2N0eC51cmx9IC0gJHttc31tc2ApO1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIGFwcC51c2UoYXN5bmMgY3R4ID0+IHtcclxuICAgICAgICBsZXQgY29sbCA9IGRiLmNvbGxlY3Rpb24oJ3RvcnJlbnRzJyk7XHJcbiAgICAgICAgY3R4LmJvZHkgPSAnSGVsbG8sIFdyb2xkIScgKyBhd2FpdCBjb2xsLmNvdW50KHt9KTtcclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICBhcHAubGlzdGVuKDMwMDApO1xyXG59XHJcblxyXG5cclxubWFpbigpO1xyXG5cclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
