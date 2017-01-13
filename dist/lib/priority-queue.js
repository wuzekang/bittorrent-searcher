"use strict";
var PriorityQueue = (function () {
    function PriorityQueue(compareFn) {
        if (compareFn === void 0) { compareFn = function (_lhs, _rhs) { return _lhs - _rhs; }; }
        this._queues = new Map();
        this._priorites = [];
        this._compareFn = null;
        this._size = 0;
        this._compareFn = compareFn;
    }
    Object.defineProperty(PriorityQueue.prototype, "size", {
        get: function () { return this._size; },
        enumerable: true,
        configurable: true
    });
    PriorityQueue.prototype.push = function (value, priority) {
        var _a = this, _priorites = _a._priorites, _queues = _a._queues, _compareFn = _a._compareFn;
        if (!_queues.has(priority)) {
            _queues.set(priority, []);
            _priorites.push(priority);
            _priorites.sort(this._compareFn);
        }
        _queues.get(priority).push(value);
        ++this._size;
    };
    PriorityQueue.prototype.pop = function () {
        if (this._priorites.length == 0)
            return undefined;
        var _priority = this._priorites[0];
        var queue = this._queues.get(_priority), value = queue.shift();
        if (queue.length == 0) {
            this._priorites.shift();
            this._queues.delete(_priority);
        }
        --this._size;
        return value;
    };
    return PriorityQueue;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PriorityQueue;
