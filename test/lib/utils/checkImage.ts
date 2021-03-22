const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;
const fs = require('fs');

const path = require('path');

const getFixtureAsBuffer = (pathname) => {
  const fullpath = path.resolve(__dirname, "../../__fixtures__", pathname);
  const data = fs.readFileSync(fullpath);
  return PNG.sync.read(data);
};

const checkImage = (src, fixtureSrc, diffSrc) => {
  const fixture = getFixtureAsBuffer(fixtureSrc);
  console.log('src', src);
  if (!src.includes('base64,')) {
    throw new Error('No "base64," tag found in the incoming src, this may indicate a bad src attribute.');
  }
  const upscaledImageBuffer = Buffer.from(src.split('base64,').pop(), 'base64');
  const upscaledImage = PNG.sync.read(upscaledImageBuffer);

  expect(upscaledImage.width).toEqual(fixture.width);
  expect(upscaledImage.height).toEqual(fixture.height);

  const diff = new PNG({ width: fixture.width, height: fixture.height });
  const mismatched = pixelmatch(fixture.data, upscaledImage.data, diff.data, fixture.width, fixture.height, { threshold: 0.1 });
  if (mismatched > 0) {
    fs.writeFileSync(diffSrc, PNG.sync.write(diff));
  }
  expect(mismatched).toEqual(0);
}

module.exports = checkImage;
