export default class PriorityQueue<K, V> {
    
    _queues:Map<K, Array<V>> = new Map();
    _priorites:Array<K> = [];
    _compareFn = null;
    _size = 0;

    get size() { return this._size; }

    constructor(compareFn = (_lhs, _rhs) => _lhs - _rhs) {
        this._compareFn = compareFn;
    }

    push (value: V, priority: K) : void {
        let {_priorites, _queues, _compareFn} = this;
        if (!_queues.has(priority)) {
            _queues.set(priority, []);
            _priorites.push(priority);
            _priorites.sort(this._compareFn);
        } 
        _queues.get(priority).push(value);
        ++ this._size;
    }

    pop() : V {
        if (this._priorites.length == 0) return undefined;
        let _priority = this._priorites[0];
        let queue = this._queues.get(_priority),
            value = queue.shift();
        if (queue.length == 0) {
            this._priorites.shift();
            this._queues.delete(_priority);
        }
        -- this._size;
        return value;
    }


}