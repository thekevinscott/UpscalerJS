import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { getFixtureAsBuffer } from './getFixtureAsBuffer';
import * as _PNG from 'pngjs';
const { PNG } = _PNG;

// 0.10 works for browser; 0.12 for node.
const THRESHOLD = 0.12;

export const checkImage = (src: string | any, fixtureSrc: string, diffSrc: string, upscaledSrc?: string) => {
  if (typeof(src) !== 'string') {
    throw new Error(`Type of src is not string. src: ${JSON.stringify(src)}`)
  }
  const fixture = getFixtureAsBuffer(fixtureSrc);
  // console.log('fixture', fixtureSrc, fixture.width, fixture.height);
  if (!src.includes('base64,')) {
    throw new Error(`No "base64," tag found in the incoming src, this may indicate a bad src attribute. src: ${src}`);
  }
  const upscaledImageBuffer = Buffer.from(src.split('base64,').pop(), 'base64');
  const upscaledImage = PNG.sync.read(upscaledImageBuffer);
  if (upscaledSrc) {
    console.log(`Writing upscaled image to ${upscaledSrc}`)
    fs.writeFileSync(upscaledSrc, PNG.sync.write(upscaledImage));
  }

  try {
  expect(fixture.width).toEqual(upscaledImage.width);
  expect(fixture.height).toEqual(upscaledImage.height);
  } catch(err) {
    throw new Error(`Mismatch in image dimensions.
    
    Upscaled Image: w ${upscaledImage.width} h ${upscaledImage.height}
    Fixture: w ${fixture.width} h ${fixture.height}
    `)
  }

  const diff = new PNG({ width: fixture.width, height: fixture.height });
  const mismatched = pixelmatch(fixture.data, upscaledImage.data, diff.data, fixture.width, fixture.height, { threshold: THRESHOLD });
  if (mismatched > 0) {
    console.log(`Mismatch, writing diff image to ${diffSrc}`)
    fs.writeFileSync(diffSrc, PNG.sync.write(diff));
  }
  expect(mismatched).toEqual(0);
}
