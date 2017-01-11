"use strict";
function getIntFromBuffer(buffer, start, end) {
    var sum = 0;
    var sign = 1;
    for (var i = start; i < end; i++) {
        var num = buffer[i];
        if (num < 58 && num >= 48) {
            sum = sum * 10 + (num - 48);
            continue;
        }
        if (i === start && num === 43) {
            continue;
        }
        if (i === start && num === 45) {
            sign = -1;
            continue;
        }
        if (num === 46) {
            // its a float. break here.
            break;
        }
        throw new Error('not a number: buffer[' + i + '] = ' + num);
    }
    return sum * sign;
}
/**
 * Decodes bencoded data.
 *
 * @param  {Buffer} data
 * @param  {Number} start (optional)
 * @param  {Number} end (optional)
 * @param  {String} encoding (optional)
 * @return {Object|Array|Buffer|String|Number}
 */
function decode(data, encoding) {
    if (data == null || data.length === 0) {
        return null;
    }
    _position = 0;
    _encoding = encoding || null;
    _data = !(Buffer.isBuffer(data))
        ? new Buffer(data)
        : data;
    _bytes = _data.length;
    return _next();
}
var _bytes = 0;
var _position = 0;
var _data = null;
var _encoding = null;
function _next() {
    switch (_data[_position]) {
        case 0x64:
            return _dictionary();
        case 0x6C:
            return _list();
        case 0x69:
            return _integer();
        default:
            return _buffer();
    }
}
function _find(chr) {
    var i = _position;
    var c = _data.length;
    var d = _data;
    while (i < c) {
        if (d[i] === chr)
            return i;
        i++;
    }
    throw new Error('Invalid data: Missing delimiter "' +
        String.fromCharCode(chr) + '" [0x' +
        chr.toString(16) + ']');
}
function _dictionary() {
    _position++;
    var dict = {};
    while (_data[_position] !== 0x65) {
        dict[_buffer()] = _next();
    }
    _position++;
    return dict;
}
function _list() {
    _position++;
    var lst = [];
    while (_data[_position] !== 0x65) {
        lst.push(_next());
    }
    _position++;
    return lst;
}
function _integer() {
    var end = _find(0x65);
    var number = getIntFromBuffer(_data, _position + 1, end);
    _position += end + 1 - _position;
    return number;
}
function _buffer() {
    var sep = _find(0x3A);
    var length = getIntFromBuffer(_data, _position, sep);
    var end = ++sep + length;
    _position = end;
    return _encoding
        ? _data.toString(_encoding, sep, end)
        : _data.slice(sep, end);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = decode;
