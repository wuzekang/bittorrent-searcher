import { DHT } from './lib/bittorrent';
import { MongoClient, Db, Collection } from 'mongodb';

import * as parseTorrent from 'parse-torrent';
import * as fs from 'fs';
import * as path from 'path';
import * as koa from 'koa';

import * as cache from 'koa-static-cache';

import pug = require('pug');

let spider = new DHT();

spider.listen(6881);
spider.crawle();

const view = (name, value) => {    
    let pieces = [__dirname, 'views'].concat(name.split('.')),
        file = path.join(...pieces) + '.pug';
    return pug.renderFile(file, value);
}

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

    app.use(cache(path.join(__dirname, 'public')));



    app.use(async ctx => {

        let {query} = ctx.request,
            {search, page, limit} = query;
        
        let _search = search || '',
            _page = page && parseInt(page) && page > 0 ? parseInt(page) : 1,
            _limit = limit && parseInt(limit) && limit > 0 ? parseInt(limit) : 20,
            _query : any = { infoHash:{ $ne: null } };
        
        if (search) _query.$text = { $search: _search };

        let _total = await Torrent.count(_query),
            torrents = await Torrent.find(_query)
                .limit(_limit).skip(_limit * (_page - 1)).toArray();
        
        let total = Math.ceil(_total / _limit),
            count = 10,
            left = Math.floor(count / 2),
            right = Math.ceil(count / 2);
        
        let begin = 1, end = total;
        if (total > count) {
            begin = _page - left;
            end =  _page + right - 1;
            if (begin < 1) {end += 1 - begin; begin = 1;}
            if (end > total) {begin += total - end; end = total;}
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
    });

    app.listen(3000);
}


main();

