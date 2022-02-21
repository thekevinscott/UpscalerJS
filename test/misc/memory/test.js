const path = require('path');
const { spawn } = require('child_process');
const test = require('tape');
const kill = require('tree-kill');
const puppeteer = require('puppeteer');

const THRESHOLD = .1; // how much can resident set grow before we consider it a memory leak?

const runProcess = (command, args, stdout) => {
  const spawnedProcess = spawn(command, args);

  spawnedProcess.stdout.on('data', (data) => {
    stdout(data.toString());
  });

  spawnedProcess.stderr.on('data', (data) => {
    // process.stderr.write(data.toString());
  });

  spawnedProcess.on('exit', (data) => {
    if (data) {
      process.stderr.write(data.toString());
    }
  });

  return spawnedProcess;
}

class Monitor {
  rss = []

  averageLength = 2;

  lastAverage = null;
  start = null;

  threshold = 1;

  callback = () => {}

  constructor(callback, threshold) {
    this.callback = callback;
    this.threshold = threshold + 1;
  }

  getAverage() {
    return this.rss.reduce((sum, r) => sum + r, 0) / this.rss.length;
  }

  addRss(rss) {
    this.rss.push(rss);
    if (this.rss.length > this.averageLength) {
      this.rss.shift();
      this.report();
    }
  }

  report() {
    const avg = this.getAverage();
    if (this.start) {
      const diff = avg / this.start;
      const amount = Math.round((diff - 1) * 10000) / 100;
      const threshold = Math.round((this.threshold - 1) * 10000) / 100;
      if (diff > this.threshold) {
        const msg = `Resident Set has grown by ${amount}%, which exceeds the threshold of ${threshold}%`;
        this.callback(msg);
        return msg;
      }

      return `Resident Set has grown by ${amount}%, which is below the threshold of ${threshold}%`;
    } else {
      this.start = avg;
    }
  }
}

const countObjects = async (page) => {
  // Get a handle to the Map object prototype
  const mapPrototype = await page.evaluateHandle(() => Map.prototype);
  // Query all map instances into an array
  const mapInstances = await page.queryObjects(mapPrototype);
  // Count amount of map objects in heap
  const count = await page.evaluate(maps => maps.length, mapInstances);
  await mapInstances.dispose();
  await mapPrototype.dispose();
  return count;

  // const prototype = await page.evaluateHandle(() => {
  //   return Object.prototype;
  // });
  // const objects = await page.queryObjects(
  //   prototype
  // );
  // console.log('objects', objects);
  // console.log('objects', objects);
  // const numberOfObjects = await page.evaluate(
  //   (instances) => instances.length,
  //   objects
  // );

  // await prototype.dispose();
  // await instances.dispose();

  // return numberOfObjects;
};

test('should not have a memory leak', async () => {
  const browser = await puppeteer.launch();
  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  const numberOfObjects = await countObjects(page);

  await page.evaluate(() => window.map = new Map());


  expect(await countObjects(page)).to.equal(numberOfObjects);
  context.close();
  browser.close();
});

// test('check Node memory leaks with pixelator model and no patch sizes', async (t) => new Promise((resolve, reject) => {
//   const ITERATIONS = 1000 * 1;
//   let process;
//   let lastIteration = 0;
//   const monitor = new Monitor((err) => {
//     kill(process.pid);
//     reject(`${err} | at iteration ${lastIteration}`);
//   }, THRESHOLD);
//   process = runProcess('node', ['--expose-gc', path.resolve(__dirname, './leak.js'), '--model', 'pixelator', '--iterations', ITERATIONS], data => {
//     if (data.startsWith('rss: ')) {
//       const [rss, iteration] = data.split('rss: ').pop().split('|').map(e => e.trim());
//       lastIteration = iteration;
//       monitor.addRss(Number(rss));
//     }
//   });
//   process.on('exit', () => {
//     console.log(monitor.report(), ITERATIONS);
//     resolve();
//   });
// }));

// test('check Node memory leaks with default model and no patch sizes', async (t) => new Promise((resolve, reject) => {
//   let process;
//   const monitor = new Monitor((err) => {
//     kill(process.pid);
//     reject(err);
//   }, THRESHOLD);
//   process = runProcess('node', ['--expose-gc', path.resolve(__dirname, './leak.js'), '--model', 'default', '--iterations', 100], data => {
//     if (data.startsWith('rss: ')) {
//       monitor.addRss(Number(data));
//     }
//   });
//   process.on('exit', () => {
//     console.log(monitor.report())
//     resolve();
//   });
// }));
