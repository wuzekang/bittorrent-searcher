"use strict";
/**
 * Encodes data in bencode.
 *
 * @param  {Buffer|Array|String|Object|Number|Boolean} data
 * @return {Buffer}
 */
function encode(data) {
    var buffers = [];
    var result = null;
    _encode(buffers, data);
    result = Buffer.concat(buffers);
    _bytes = result.length;
    return result;
}
var _bytes = -1;
var _floatConversionDetected = false;
function _encode(buffers, data) {
    if (Buffer.isBuffer(data)) {
        buffers.push(new Buffer(data.length + ':'));
        buffers.push(data);
        return;
    }
    if (data == null) {
        return;
    }
    switch (typeof data) {
        case 'string':
            _buffer(buffers, data);
            break;
        case 'number':
            _number(buffers, data);
            break;
        case 'object':
            data.constructor === Array
                ? _list(buffers, data)
                : _dict(buffers, data);
            break;
        case 'boolean':
            _number(buffers, data ? 1 : 0);
            break;
    }
}
var buffE = new Buffer('e');
var buffD = new Buffer('d');
var buffL = new Buffer('l');
function _buffer(buffers, data) {
    buffers.push(new Buffer(Buffer.byteLength(data) + ':' + data));
}
function _number(buffers, data) {
    var maxLo = 0x80000000;
    var hi = (data / maxLo) << 0;
    var lo = (data % maxLo) << 0;
    var val = hi * maxLo + lo;
    buffers.push(new Buffer('i' + val + 'e'));
    if (val !== data && !_floatConversionDetected) {
        _floatConversionDetected = true;
        console.warn('WARNING: Possible data corruption detected with value "' + data + '":', 'Bencoding only defines support for integers, value was converted to "' + val + '"');
        console.trace();
    }
}
function _dict(buffers, data) {
    buffers.push(buffD);
    var j = 0;
    var k;
    // fix for issue #13 - sorted dicts
    var keys = Object.keys(data).sort();
    var kl = keys.length;
    for (; j < kl; j++) {
        k = keys[j];
        if (data[k] == null)
            continue;
        _buffer(buffers, k);
        _encode(buffers, data[k]);
    }
    buffers.push(buffE);
}
function _list(buffers, data) {
    var i = 0;
    var c = data.length;
    buffers.push(buffL);
    for (; i < c; i++) {
        if (data[i] == null)
            continue;
        _encode(buffers, data[i]);
    }
    buffers.push(buffE);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = encode;
