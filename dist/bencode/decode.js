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

//# sourceMappingURL=data:application/json;base64,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QVMsQ0FBQTtJQUVoQyxNQUFNLENBQUMsTUFBTSxDQUFBO0FBQ2YsQ0FBQztBQUVEO0lBQ0UsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3JCLElBQUksTUFBTSxHQUFHLGdCQUFnQixDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDcEQsSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFBO0lBRXhCLFNBQVMsR0FBRyxHQUFHLENBQUE7SUFFZixNQUFNLENBQUMsU0FBUztVQUNaLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7VUFDbkMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDM0IsQ0FBQzs7QUFFRCxrQkFBZSxNQUFNLENBQUMiLCJmaWxlIjoiYmVuY29kZS9kZWNvZGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBnZXRJbnRGcm9tQnVmZmVyIChidWZmZXIsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHN1bSA9IDBcbiAgdmFyIHNpZ24gPSAxXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICB2YXIgbnVtID0gYnVmZmVyW2ldXG5cbiAgICBpZiAobnVtIDwgNTggJiYgbnVtID49IDQ4KSB7XG4gICAgICBzdW0gPSBzdW0gKiAxMCArIChudW0gLSA0OClcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgaWYgKGkgPT09IHN0YXJ0ICYmIG51bSA9PT0gNDMpIHsgLy8gK1xuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICBpZiAoaSA9PT0gc3RhcnQgJiYgbnVtID09PSA0NSkgeyAvLyAtXG4gICAgICBzaWduID0gLTFcbiAgICAgIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgaWYgKG51bSA9PT0gNDYpIHsgLy8gLlxuICAgICAgLy8gaXRzIGEgZmxvYXQuIGJyZWFrIGhlcmUuXG4gICAgICBicmVha1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcignbm90IGEgbnVtYmVyOiBidWZmZXJbJyArIGkgKyAnXSA9ICcgKyBudW0pXG4gIH1cblxuICByZXR1cm4gc3VtICogc2lnblxufVxuXG4vKipcbiAqIERlY29kZXMgYmVuY29kZWQgZGF0YS5cbiAqXG4gKiBAcGFyYW0gIHtCdWZmZXJ9IGRhdGFcbiAqIEBwYXJhbSAge051bWJlcn0gc3RhcnQgKG9wdGlvbmFsKVxuICogQHBhcmFtICB7TnVtYmVyfSBlbmQgKG9wdGlvbmFsKVxuICogQHBhcmFtICB7U3RyaW5nfSBlbmNvZGluZyAob3B0aW9uYWwpXG4gKiBAcmV0dXJuIHtPYmplY3R8QXJyYXl8QnVmZmVyfFN0cmluZ3xOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGRlY29kZSAoZGF0YSA6IGFueSwgZW5jb2RpbmcgPzogU3RyaW5nKSB7XG4gIGlmIChkYXRhID09IG51bGwgfHwgZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgX3Bvc2l0aW9uID0gMFxuICBfZW5jb2RpbmcgPSBlbmNvZGluZyB8fCBudWxsXG5cbiAgX2RhdGEgPSAhKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSlcbiAgICA/IG5ldyBCdWZmZXIoZGF0YSlcbiAgICA6IGRhdGFcblxuICBfYnl0ZXMgPSBfZGF0YS5sZW5ndGhcblxuICByZXR1cm4gX25leHQoKVxufVxuXG5sZXQgX2J5dGVzID0gMFxubGV0IF9wb3NpdGlvbiA9IDBcbmxldCBfZGF0YSA9IG51bGxcbmxldCBfZW5jb2RpbmcgPSBudWxsXG5cbmZ1bmN0aW9uIF9uZXh0ICgpIHtcbiAgc3dpdGNoIChfZGF0YVtfcG9zaXRpb25dKSB7XG4gICAgY2FzZSAweDY0OlxuICAgICAgcmV0dXJuIF9kaWN0aW9uYXJ5KClcbiAgICBjYXNlIDB4NkM6XG4gICAgICByZXR1cm4gX2xpc3QoKVxuICAgIGNhc2UgMHg2OTpcbiAgICAgIHJldHVybiBfaW50ZWdlcigpXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBfYnVmZmVyKClcbiAgfVxufVxuXG5mdW5jdGlvbiBfZmluZCAoY2hyKSB7XG4gIHZhciBpID0gX3Bvc2l0aW9uXG4gIHZhciBjID0gX2RhdGEubGVuZ3RoXG4gIHZhciBkID0gX2RhdGFcblxuICB3aGlsZSAoaSA8IGMpIHtcbiAgICBpZiAoZFtpXSA9PT0gY2hyKSByZXR1cm4gaVxuICAgIGkrK1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgICdJbnZhbGlkIGRhdGE6IE1pc3NpbmcgZGVsaW1pdGVyIFwiJyArXG4gICAgU3RyaW5nLmZyb21DaGFyQ29kZShjaHIpICsgJ1wiIFsweCcgK1xuICAgIGNoci50b1N0cmluZygxNikgKyAnXSdcbiAgKVxufVxuXG5mdW5jdGlvbiBfZGljdGlvbmFyeSAoKSB7XG4gIF9wb3NpdGlvbisrXG5cbiAgdmFyIGRpY3QgPSB7fVxuXG4gIHdoaWxlIChfZGF0YVtfcG9zaXRpb25dICE9PSAweDY1KSB7XG4gICAgZGljdFtfYnVmZmVyKCldID0gX25leHQoKVxuICB9XG5cbiAgX3Bvc2l0aW9uKytcblxuICByZXR1cm4gZGljdFxufVxuXG5mdW5jdGlvbiBfbGlzdCAoKSB7XG4gIF9wb3NpdGlvbisrXG5cbiAgdmFyIGxzdCA9IFtdXG5cbiAgd2hpbGUgKF9kYXRhW19wb3NpdGlvbl0gIT09IDB4NjUpIHtcbiAgICBsc3QucHVzaChfbmV4dCgpKVxuICB9XG5cbiAgX3Bvc2l0aW9uKytcblxuICByZXR1cm4gbHN0XG59XG5cbmZ1bmN0aW9uIF9pbnRlZ2VyICgpIHtcbiAgdmFyIGVuZCA9IF9maW5kKDB4NjUpXG4gIHZhciBudW1iZXIgPSBnZXRJbnRGcm9tQnVmZmVyKF9kYXRhLCBfcG9zaXRpb24gKyAxLCBlbmQpXG5cbiAgX3Bvc2l0aW9uICs9IGVuZCArIDEgLSBfcG9zaXRpb25cblxuICByZXR1cm4gbnVtYmVyXG59XG5cbmZ1bmN0aW9uIF9idWZmZXIgKCkge1xuICB2YXIgc2VwID0gX2ZpbmQoMHgzQSlcbiAgdmFyIGxlbmd0aCA9IGdldEludEZyb21CdWZmZXIoX2RhdGEsIF9wb3NpdGlvbiwgc2VwKVxuICB2YXIgZW5kID0gKytzZXAgKyBsZW5ndGhcblxuICBfcG9zaXRpb24gPSBlbmRcblxuICByZXR1cm4gX2VuY29kaW5nXG4gICAgPyBfZGF0YS50b1N0cmluZyhfZW5jb2RpbmcsIHNlcCwgZW5kKVxuICAgIDogX2RhdGEuc2xpY2Uoc2VwLCBlbmQpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlY29kZTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
