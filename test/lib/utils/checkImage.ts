import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { getFixtureAsBuffer } from './getFixtureAsBuffer';
// import { PNG } from 'pngjs/browser';
const PNG = require('pngjs').PNG;

export const checkImage = (src: string | any, fixtureSrc: string, diffSrc: string) => {
  if (typeof(src) !== 'string') {
    throw new Error(`Type of src is not string. src: ${JSON.stringify(src)}`)
  }
  const fixture = getFixtureAsBuffer(fixtureSrc);
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
