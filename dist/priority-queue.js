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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByaW9yaXR5LXF1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtJQVNJLHVCQUFZLFNBQXVDO1FBQXZDLDBCQUFBLEVBQUEsc0JBQWEsSUFBSSxFQUFFLElBQUksSUFBSyxPQUFBLElBQUksR0FBRyxJQUFJLEVBQVgsQ0FBVztRQVBuRCxZQUFPLEdBQW9CLElBQUksR0FBRyxFQUFFLENBQUM7UUFDckMsZUFBVSxHQUFZLEVBQUUsQ0FBQztRQUN6QixlQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLFVBQUssR0FBRyxDQUFDLENBQUM7UUFLTixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztJQUNoQyxDQUFDO0lBSkQsc0JBQUksK0JBQUk7YUFBUixjQUFhLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzs7O09BQUE7SUFNakMsNEJBQUksR0FBSixVQUFNLEtBQVEsRUFBRSxRQUFXO1FBQ25CLElBQUEsU0FBd0MsRUFBdkMsMEJBQVUsRUFBRSxvQkFBTyxFQUFFLDBCQUFVLENBQVM7UUFDN0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMxQixVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQyxFQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbEIsQ0FBQztJQUVELDJCQUFHLEdBQUg7UUFDSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ2xELElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQ25DLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDMUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNELEVBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUNkLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUdMLG9CQUFDO0FBQUQsQ0F0Q0EsQUFzQ0MsSUFBQSIsImZpbGUiOiJwcmlvcml0eS1xdWV1ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBkZWZhdWx0IGNsYXNzIFByaW9yaXR5UXVldWU8SywgVj4ge1xuICAgIFxuICAgIF9xdWV1ZXM6TWFwPEssIEFycmF5PFY+PiA9IG5ldyBNYXAoKTtcbiAgICBfcHJpb3JpdGVzOkFycmF5PEs+ID0gW107XG4gICAgX2NvbXBhcmVGbiA9IG51bGw7XG4gICAgX3NpemUgPSAwO1xuXG4gICAgZ2V0IHNpemUoKSB7IHJldHVybiB0aGlzLl9zaXplOyB9XG5cbiAgICBjb25zdHJ1Y3Rvcihjb21wYXJlRm4gPSAoX2xocywgX3JocykgPT4gX2xocyAtIF9yaHMpIHtcbiAgICAgICAgdGhpcy5fY29tcGFyZUZuID0gY29tcGFyZUZuO1xuICAgIH1cblxuICAgIHB1c2ggKHZhbHVlOiBWLCBwcmlvcml0eTogSykgOiB2b2lkIHtcbiAgICAgICAgbGV0IHtfcHJpb3JpdGVzLCBfcXVldWVzLCBfY29tcGFyZUZufSA9IHRoaXM7XG4gICAgICAgIGlmICghX3F1ZXVlcy5oYXMocHJpb3JpdHkpKSB7XG4gICAgICAgICAgICBfcXVldWVzLnNldChwcmlvcml0eSwgW10pO1xuICAgICAgICAgICAgX3ByaW9yaXRlcy5wdXNoKHByaW9yaXR5KTtcbiAgICAgICAgICAgIF9wcmlvcml0ZXMuc29ydCh0aGlzLl9jb21wYXJlRm4pO1xuICAgICAgICB9IFxuICAgICAgICBfcXVldWVzLmdldChwcmlvcml0eSkucHVzaCh2YWx1ZSk7XG4gICAgICAgICsrIHRoaXMuX3NpemU7XG4gICAgfVxuXG4gICAgcG9wKCkgOiBWIHtcbiAgICAgICAgaWYgKHRoaXMuX3ByaW9yaXRlcy5sZW5ndGggPT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IF9wcmlvcml0eSA9IHRoaXMuX3ByaW9yaXRlc1swXTtcbiAgICAgICAgbGV0IHF1ZXVlID0gdGhpcy5fcXVldWVzLmdldChfcHJpb3JpdHkpLFxuICAgICAgICAgICAgdmFsdWUgPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICBpZiAocXVldWUubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHRoaXMuX3ByaW9yaXRlcy5zaGlmdCgpO1xuICAgICAgICAgICAgdGhpcy5fcXVldWVzLmRlbGV0ZShfcHJpb3JpdHkpO1xuICAgICAgICB9XG4gICAgICAgIC0tIHRoaXMuX3NpemU7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cblxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
