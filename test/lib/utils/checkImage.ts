import path from 'path';
import fs from 'fs-extra';
import pixelmatch from 'pixelmatch';
import { getFixtureAsBuffer } from './getFixtureAsBuffer';
import { PNG } from 'pngjs';

const ROOT = path.resolve(__dirname, '../../../');

// 0.10 works for browser; 0.12 for node.
const THRESHOLD = 0.12;

export const checkImage = (src: string | any, fixtureSrc: string, diffSrc: string, upscaledSrc?: string) => {
  if (typeof(src) !== 'string') {
    throw new Error(`Type of src is not string. src: ${JSON.stringify(src)}`)
  }
  const fixture = getFixtureAsBuffer(fixtureSrc);
  if (!src.includes('base64,')) {
    throw new Error(`No "base64," tag found in the incoming src, this may indicate a bad src attribute. src: ${src}`);
  }
  const partsAfterBase64 = src.split('base64,').pop();
  if (!partsAfterBase64) {
    throw new Error(`No data after base64 definition in src: ${src}`);
  }
  const upscaledImageBuffer = Buffer.from(partsAfterBase64, 'base64');
  const upscaledImage = PNG.sync.read(upscaledImageBuffer);

  try {
  expect(fixture.width).toEqual(upscaledImage.width);
  expect(fixture.height).toEqual(upscaledImage.height);
  } catch(err) {
    if (upscaledSrc) {
      console.log(`Writing upscaled image to ${upscaledSrc}`)
      writeImage(upscaledSrc, upscaledImage);
    }
    throw new Error(`Mismatch in image dimensions.
    
    Upscaled Image: w ${upscaledImage.width} h ${upscaledImage.height}
    Fixture: w ${fixture.width} h ${fixture.height}
    `)
  }

  const diff = new PNG({ width: fixture.width, height: fixture.height });
  const mismatched = pixelmatch(fixture.data, upscaledImage.data, diff.data, fixture.width, fixture.height, { threshold: THRESHOLD });
  if (mismatched > 0) {
    if (upscaledSrc) {
      console.log(`Writing upscaled image to ${upscaledSrc}`)
      writeImage(upscaledSrc, upscaledImage);
    }
    console.log(`Mismatch, writing diff image to ${diffSrc}`)
    writeImage(diffSrc, diff);
  }
  expect(mismatched).toEqual(0);
}

const writeImage = (pathToImage: string, contents: PNG) => {
  const fullPathToImage = path.resolve(ROOT, 'test-output', pathToImage);
  fs.mkdirpSync(path.resolve(ROOT, fullPathToImage, '..'));
  fs.writeFileSync(fullPathToImage, PNG.sync.write(contents));
}
