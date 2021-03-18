const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;
const fs = require('fs');

const path = require('path');

const getFixtureAsBuffer = (pathname) => {
  const fullpath = path.resolve(__dirname, "__fixtures__", pathname);
  const data = fs.readFileSync(fullpath);
  // return Buffer.from(data, 'binary');
  return PNG.sync.read(data);
};

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

module.exports = checkImage;
