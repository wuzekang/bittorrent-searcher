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
var bittorrent_1 = require("./bittorrent");
var mongodb_1 = require("mongodb");
var parseTorrent = require("parse-torrent");
var koa = require("koa");
var spider = new bittorrent_1.DHT();
spider.listen(6881);
spider.crawle();
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
                app.use(function (ctx) { return __awaiter(_this, void 0, void 0, function () {
                    var torrents;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, Torrent.find({ infoHash: { $ne: null } }).limit(20).toArray()];
                            case 1:
                                torrents = _a.sent();
                                ctx.body = JSON.stringify(torrents);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlCQW9FQTtBQXBFQSwyQ0FBbUM7QUFDbkMsbUNBQXNEO0FBRXRELDRDQUE4QztBQUc5Qyx5QkFBMkI7QUFFM0IsSUFBSSxNQUFNLEdBQUcsSUFBSSxnQkFBRyxFQUFFLENBQUM7QUFFdkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQixNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEIsSUFBTSxXQUFXLEdBQUcsVUFBQyxRQUFxQjtJQUN0QyxNQUFNLENBQUMsVUFBTyxTQUFTLEVBQUUsUUFBUTtZQUN6QixHQUFHLEVBQ0gsUUFBUSxFQUNSLE9BQU8sRUFDTixRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxNQUFNOzs7OzBCQUg5RCxTQUFTO29CQUNKLE1BQU0sZUFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQUE7O29EQUMvQixRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsYUFDb0IsT0FBTyxrQkFBUCxPQUFPLGVBQVAsT0FBTyxpQkFBUCxPQUFPLHVCQUFQLE9BQU8sZ0NBQVAsT0FBTywyQkFBUCxPQUFPO29CQUMvRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUN2QixPQUFPLEdBQUc7d0JBQ04sR0FBRyxFQUFFLEdBQUc7d0JBQ1IsUUFBUSxFQUFFLFFBQVE7d0JBQ2xCLElBQUksRUFBRSxJQUFJO3dCQUNWLEtBQUssRUFBRSxLQUFLO3dCQUNaLE1BQU0sRUFBRSxNQUFNO3dCQUNkLFNBQVMsRUFBRSxDQUFDO3FCQUNmLENBQUE7b0JBRUwsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUNaLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQzVCLENBQUM7b0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQSxDQUFDO3dCQUMxQixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBQyxFQUFFLEVBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQTtvQkFDcEUsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUMxQyxDQUFDOzs7O1NBRUosQ0FBQTtBQUNMLENBQUMsQ0FBQTtBQUVELElBQU0sSUFBSSxHQUFHOztRQUNILEdBQUcsRUFDTCxFQUFFLEVBQ0YsT0FBTyxFQUlMLEdBQUc7Ozs7c0JBTkcsZ0NBQWdDO2dCQUNuQyxNQUFNLGVBQUEscUJBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUE7OzBDQUN6QixFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztnQkFFdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7c0JBRWhDLElBQUksR0FBRyxFQUFFO2dCQUdyQixHQUFHLENBQUMsR0FBRyxDQUFDLFVBQU8sR0FBRyxFQUFFLElBQUk7d0JBQ2QsS0FBSyxFQUVQLEVBQUU7Ozs7d0NBRlEsSUFBSSxJQUFJLEVBQUU7Z0NBQ3hCLE1BQU0sZUFBQSxJQUFJLEVBQUUsRUFBQTs7Z0NBQVosVUFBYTtxQ0FDSixJQUFJLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUU7Z0NBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUksR0FBRyxDQUFDLE1BQU0sU0FBSSxHQUFHLENBQUMsR0FBRyxXQUFNLEVBQUUsT0FBSSxDQUFDLENBQUM7Ozs7cUJBQ3JELENBQUMsQ0FBQztnQkFFSCxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQU0sR0FBRzt3QkFDVCxRQUFROzs7b0NBQUcsTUFBTSxlQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxRQUFRLEVBQUMsRUFBQyxHQUFHLEVBQUMsSUFBSSxFQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBQTs7O2dDQUM1RSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7Ozs7cUJBQ3ZDLENBQUMsQ0FBQztnQkFFSCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7O0tBQ3BCLENBQUE7QUFHRCxJQUFJLEVBQUUsQ0FBQyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERIVCB9IGZyb20gJy4vYml0dG9ycmVudCc7XG5pbXBvcnQgeyBNb25nb0NsaWVudCwgRGIsIENvbGxlY3Rpb24gfSBmcm9tICdtb25nb2RiJztcblxuaW1wb3J0ICogYXMgcGFyc2VUb3JyZW50IGZyb20gJ3BhcnNlLXRvcnJlbnQnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGtvYSBmcm9tICdrb2EnO1xuXG5sZXQgc3BpZGVyID0gbmV3IERIVCgpO1xuXG5zcGlkZXIubGlzdGVuKDY4ODEpO1xuc3BpZGVyLmNyYXdsZSgpO1xuXG5jb25zdCBfb25NZXRhZGF0YSA9ICh0b3JyZW50cyA6IENvbGxlY3Rpb24pID0+IHtcbiAgICByZXR1cm4gYXN5bmMgKGluZm9faGFzaCwgbWV0YWRhdGEpID0+IHtcbiAgICAgICAgbGV0IF9pZCA9IGluZm9faGFzaCxcbiAgICAgICAgICAgIF90b3JyZW50ID0gYXdhaXQgdG9ycmVudHMuZmluZE9uZSh7X2lkOiBfaWR9KSxcbiAgICAgICAgICAgIHRvcnJlbnQ6YW55ID0gbWV0YWRhdGEgPyBwYXJzZVRvcnJlbnQobWV0YWRhdGEpIDoge30sXG4gICAgICAgICAgICB7aW5mb0hhc2gsIG5hbWUsIGZpbGVzLCBsZW5ndGgsIHBpZWNlTGVuZ3RoLCBsYXN0UGllY2VMZW5ndGgsIHBpZWNlc30gPSB0b3JyZW50O1xuICAgICAgICAgICAgY29uc29sZS5sb2coaW5mb19oYXNoKTtcbiAgICAgICAgICAgIHRvcnJlbnQgPSB7XG4gICAgICAgICAgICAgICAgX2lkOiBfaWQsXG4gICAgICAgICAgICAgICAgaW5mb0hhc2g6IGluZm9IYXNoLFxuICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUgLFxuICAgICAgICAgICAgICAgIGZpbGVzOiBmaWxlcyxcbiAgICAgICAgICAgICAgICBsZW5ndGg6IGxlbmd0aCxcbiAgICAgICAgICAgICAgICBkb3dubG9hZHM6IDBcbiAgICAgICAgICAgIH1cblxuICAgICAgICBpZiAoIV90b3JyZW50KSB7XG4gICAgICAgICAgICB0b3JyZW50cy5pbnNlcnQodG9ycmVudClcbiAgICAgICAgfSBlbHNlIGlmIChfdG9ycmVudC5pbmZvSGFzaCl7XG4gICAgICAgICAgICB0b3JyZW50cy51cGRhdGUoe19pZDogX2lkfSwge2Rvd25sb2FkczogX3RvcnJlbnQuZG93bmxvYWRzICsgMX0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0b3JyZW50cy51cGRhdGUoe19pZDogX2lkfSwgX3RvcnJlbnQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cbn1cblxuY29uc3QgbWFpbiA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB1cmwgPSAnbW9uZ29kYjovL2xvY2FsaG9zdDoyNzAxNy90ZXN0JyxcbiAgICAgICAgZGIgPSBhd2FpdCBNb25nb0NsaWVudC5jb25uZWN0KHVybCksXG4gICAgICAgIFRvcnJlbnQgPSBkYi5jb2xsZWN0aW9uKCd0b3JyZW50cycpO1xuICAgIFxuICAgIHNwaWRlci5vbignbWV0YWRhdGEnLCBfb25NZXRhZGF0YShUb3JyZW50KSk7XG5cbiAgICBjb25zdCBhcHAgPSBuZXcga29hKCk7XG5cblxuICAgIGFwcC51c2UoYXN5bmMgKGN0eCwgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGF3YWl0IG5leHQoKTtcbiAgICAgICAgdmFyIG1zID0gbmV3IERhdGUoKS5nZXRVVENNaW51dGVzKCkgLSBzdGFydC5nZXRVVENNaW51dGVzKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2N0eC5tZXRob2R9ICR7Y3R4LnVybH0gLSAke21zfW1zYCk7XG4gICAgfSk7XG5cbiAgICBhcHAudXNlKGFzeW5jIGN0eCA9PiB7XG4gICAgICAgIGxldCB0b3JyZW50cyA9IGF3YWl0IFRvcnJlbnQuZmluZCh7aW5mb0hhc2g6eyRuZTpudWxsfX0pLmxpbWl0KDIwKS50b0FycmF5KCk7XG4gICAgICAgIGN0eC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkodG9ycmVudHMpO1xuICAgIH0pO1xuXG4gICAgYXBwLmxpc3RlbigzMDAwKTtcbn1cblxuXG5tYWluKCk7XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
