"use strict";
var KBucket = require("k-bucket");
var BOOTSTRAP_NODES = [
    { host: 'router.bittorrent.com', port: 6881 },
    { host: 'router.utorrent.com', port: 6881 },
    { host: 'dht.transmissionbt.comc', port: 6881 }
];
var data = "d1:ad2:id20:abcdefghij0123456789e1:q4:ping1:t2:aa1:y1:qe";
//socket.send("d1:ad2:id20:abcdefghij0123456789e1:q4:ping1:t2:aa1:y1:qe", 6881, 'router.bittorrent.com');
//socket.send("d1:ad2:id20:abcdefghij0123456789e1:q4:ping1:t2:aa1:y1:qe", 6881, 'router.utorrent.com');
//socket.send("d1:ad2:id20:abcdefghij0123456789e1:q4:ping1:t2:aa1:y1:qe", 6881, 'dht.transmissionbt.com');
var target = Buffer.from('90289fd34dfc1cf8f316a268add8354c85334458', 'hex');
var table = new KBucket({
    localNodeId: target
});
var method = 'get_peers', args = { id: 'abcdefghij0123456789', info_hash: target };
var K = 1;
Promise.all(BOOTSTRAP_NODES.map(function (peer) {
    return _query(peer, method, args);
}))
    .then(_step);
function _step(results) {
    results.forEach(function (result) {
        if (!result)
            return;
        if (result.values) {
            console.log(result);
            return;
        }
        if (result.nodes)
            result.nodes.forEach(function (node) { return table.add(node); });
    });
    var nodes = table.closest(target, K);
    Promise.all(nodes.map(function (node) { return _query(node, method, args); })).then(_step);
}
socket.on('error', function (err) {
    console.log('error');
});
