import { PNG, PNGWithMetadata } from 'pngjs';
import { getFixtureAsBuffer } from './getFixtureAsBuffer.js';

export const getImageBuffers = (src: unknown, fixtureSrc: unknown): [PNGWithMetadata, PNGWithMetadata] => {
  if (typeof (src) !== 'string') {
    throw new Error(`Type of src is not string. src: ${JSON.stringify(src)}`)
  }
  if (typeof (fixtureSrc) !== 'string') {
    throw new Error(`Type of fixtureSrc is not string. fixtureSrc: ${JSON.stringify(fixtureSrc)}`)
  }
  if (!fixtureSrc.startsWith('/')) {
    throw new Error('Fixture src paths must now be absolute');
  }
  if (!src.includes('base64,')) {
    throw new Error(`No "base64," tag found in the incoming src, this may indicate a bad src attribute. src: ${src}`);
  }
  const partsAfterBase64 = src.split('base64,').pop();
  if (!partsAfterBase64) {
    throw new Error(`No data after base64 definition in src: ${src}`);
  }
  const upscaledImageBuffer = Buffer.from(partsAfterBase64, 'base64');
  const upscaledImage = PNG.sync.read(upscaledImageBuffer);
  const fixture = getFixtureAsBuffer(fixtureSrc);
  return [upscaledImage, fixture];
}
