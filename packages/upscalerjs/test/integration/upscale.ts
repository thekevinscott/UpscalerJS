jest.setTimeout(60000);
const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;
const HtmlWebpackPlugin = require("html-webpack-plugin");
const playwright = require('playwright');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const webdriver = require('selenium-webdriver');
const browserstack = require('browserstack-local');
const webpack = require('webpack');
const fs = require('fs');

const handler = require('serve-handler');
const http = require('http');
const rimraf = require('rimraf');
const path = require('path');
const imageToBase64 = require('image-to-base64');

let compiler = undefined;
const bundle = (ROOT, DIST) => new Promise((resolve, reject) => {
  rimraf.sync(DIST);

  if (compiler === undefined) {
    const entryFiles = path.join(ROOT, 'index.js');

    compiler = webpack({
      mode: 'production',
      context: ROOT,
      entry: entryFiles,
      stats: 'errors-only',
      plugins: [new HtmlWebpackPlugin({
        title: 'UpscalerJS Integration Test Webpack Bundler Server',
      })],
      output: {
        path: DIST,
      },
      module: {
        rules: [
          {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            type: 'asset/resource',
          },
        ],
      },
    });
  }

  compiler.run((err, stats) => {
    if (err || stats.hasErrors()) {
      reject(err || stats.toJson('errors-only').errors.map(e => e.message));
    } else {
      resolve();
    }
  });
});

const startServer = (DIST, PORT) => new Promise(resolve => {
  const server = http.createServer((request, response) => handler(request, response, {
    public: DIST,
  }));
  server.listen(PORT, () => {
    resolve(server);
  });
})

const ROOT = path.join(__dirname, '../lib/webpack-bundler');
const DIST = path.join(ROOT, '/dist');

const getFixtureAsBuffer = (pathname) => {
  const fullpath = path.resolve(__dirname, "__fixtures__", pathname);
  const data = fs.readFileSync(fullpath);
  // return Buffer.from(data, 'binary');
  return PNG.sync.read(data);
};

describe("building UpscalerJS", () => {
  let browser;
  let context;
  let server;

  const PORT = 8099;

  beforeAll(async () => {
    try {
      browser = await playwright['webkit'].launch();
      context = await browser.newContext();
    } catch(err) {
      console.error(err);
      throw err;
    }
    try {
      await bundle(ROOT, DIST);
      server = await startServer(DIST, PORT);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, 60000);

  afterAll(async (done) => {
    if (browser) {
      await browser.close();
    } else {
      console.warn('No browser found');
    }
    if (server) {
      server.close(done);
    } else {
      console.warn('No server found')
    }
  });

  const checkImage = (src, fixtureSrc, diffSrc) => {
    const fixture = getFixtureAsBuffer(fixtureSrc);
    const upscaledImage = PNG.sync.read(Buffer.from(src.split('base64,').pop(), 'base64'));

    expect(upscaledImage.width).toEqual(fixture.width);
    expect(upscaledImage.height).toEqual(fixture.height);

    const diff = new PNG({ width: fixture.width, height: fixture.height });
    const mismatched = pixelmatch(fixture.data, upscaledImage.data, diff.data, fixture.width, fixture.height, { threshold: 0.1 });
    if (mismatched > 0) {
      fs.writeFileSync(diffSrc, PNG.sync.write(diff));
    }
    expect(mismatched).toEqual(0);
  }


  it("upscales an imported local image path", async () => {
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}`);
    page.on('console', console.log);
    const upscaledSrc = await page.evaluate(async ([]) => {
      return await window.upscaler.upscale(window.flower);
    }, []);
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales an HTML image element", async () => {
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}`);
    page.on('console', console.log);
    const upscaledSrc = await page.evaluate(async ([]) => {
      const img = document.createElement('img');
      img.src = window.flower;
      return await window.upscaler.upscale(img);
    }, []);
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales a tensor", async () => {
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}`);
    page.on('console', console.log);
    const upscaledSrc = await page.evaluate(async ([]) => {
      const img = document.createElement('img');
      img.src = window.flower;
      const tensor = window.tfjs.fromPixels(img);
      return await window.upscaler.upscale(tensor);
    }, []);
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales a base64 png path", async () => {
    const originalImage = getFixtureAsBuffer('flower.png');
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}`);
    page.on('console', console.log);
    const upscaledSrc = await page.evaluate(async ([flower]) => {
      return await window.upscaler.upscale(flower);
    }, [originalImage]);
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  // it("upscales an image from the interwebs", async () => {
  //   const page = await context.newPage();
  //   await page.goto(`http://localhost:${PORT}`);
  //   page.on('console', console.log);
  //   const upscaledSrc = await page.evaluate(async ([]) => {
  //     return await window.upscaler.upscale(window.flower);
  //   }, []);
  //   checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  // });
});
