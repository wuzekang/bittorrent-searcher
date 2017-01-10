
import * as Net from 'net';
import * as Koa from 'koa';
import * as DHT from 'bittorrent-dht';
import * as Protocol from 'bittorrent-protocol';
import { writeFile } from 'fs';
import { MongoClient, Db } from 'mongodb'

import * as parseTorrent from 'parse-torrent';
import * as ut_metadata from 'ut_metadata';

const main = async () => {
    const url = 'mongodb://localhost:27017/test',
        db = await MongoClient.connect(url);

    let crawlers = [],
        spider = new DHT();
    
    for (let i = 0; i < 1024; i++) {
        let crawler = new DHT();

        crawler.on('announce', (peer, infoHash, from) => {

            let socket = Net.connect(peer.port, peer.host, () => {
                
                let wire = new Protocol();
                socket.pipe(wire).pipe(socket);
                wire.use(ut_metadata());
                
                wire.handshake(infoHash, spider.nodeId);

                wire.ut_metadata.on('metadata', (metadata) => {
                    writeFile(infoHash.toString('hex'), metadata);
                    console.log(infoHash);
                })

                wire.on('handshake', (infoHash, peerId) => {
                    wire.ut_metadata.fetch();
                })
            })

            socket.on('error', err => {

            })
        })

        crawler.nodes.on('added', node => {
            
        })

        crawlers.push(crawler);
    }

    spider.on('peer', (peer, infoHash, from) => {

    })
    


    const app = new Koa();


    app.use(async (ctx, next) => {
        const start = new Date();
        await next();
        var ms = new Date().getUTCMinutes() - start.getUTCMinutes();
        console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);

    });

    app.use(async ctx => {
        let coll = db.collection('torrents');
        ctx.body = 'Hello, Wrold!' + await coll.count({});
    });


    app.listen(3000);
}


main();

