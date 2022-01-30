const path = require('path');
var heapdump = require('heapdump');

// It is important to use named constructors (like the one below), otherwise
// the heap snapshots will not produce useful outputs for you.
function LeakingClass() {
}

var leaks = [];
const makeLeak = () => {

  for (var i = 0; i < 100; i++) {
    leaks.push(new LeakingClass);
  }

  console.log(process.memoryUsage().rss);
  global.gc();
}

let count = 0;
while (count < 1000) {
  makeLeak();
  count += 1;
}
