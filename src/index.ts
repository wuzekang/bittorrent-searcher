import { DHT } from './bittorrent';
import { MongoClient, Db, Collection } from 'mongodb';

import * as parseTorrent from 'parse-torrent';
import * as fs from 'fs';
import * as path from 'path';
import * as koa from 'koa';

let spider = new DHT();

spider.listen(6881);
spider.crawle();

const _onMetadata = (torrents : Collection) => {
    return async (info_hash, metadata) => {
        let _id = info_hash,
            _torrent = await torrents.findOne({_id: _id}),
            torrent:any = metadata ? parseTorrent(metadata) : {},
            {infoHash, name, files, length, pieceLength, lastPieceLength, pieces} = torrent;
            console.log(info_hash);
            torrent = {
                _id: _id,
                infoHash: infoHash,
                name: name ,
                files: files,
                length: length,
                downloads: 0
            }

        if (!_torrent) {
            torrents.insert(torrent)
        } else if (_torrent.infoHash){
            torrents.update({_id: _id}, {downloads: _torrent.downloads + 1})
        } else {
            torrents.update({_id: _id}, _torrent);
        }
        
    }
}

const main = async () => {
    const url = 'mongodb://localhost:27017/test',
        db = await MongoClient.connect(url),
        Torrent = db.collection('torrents');
    
    spider.on('metadata', _onMetadata(Torrent));

    const app = new koa();


    app.use(async (ctx, next) => {
        const start = new Date();
        await next();
        var ms = new Date().getUTCMinutes() - start.getUTCMinutes();
        console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
    });

    app.use(async ctx => {
        let torrents = await Torrent.find({infoHash:{$ne:null}}).limit(20).toArray();
        ctx.body = JSON.stringify(torrents);
    });

    app.listen(3000);
}


main();

