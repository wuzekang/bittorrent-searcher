import {EventEmitter} from 'events';

let e = new EventEmitter();

console.log(e.emit('a'));

e.on('a', () => 1);