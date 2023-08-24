import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { pluralize } from '@internals/common/pluralize';
import { getImageBuffers } from './getImageBuffers.js';

// 0.10 works for browser; 0.12 for node.
const THRESHOLD = 0.12;

type Dimension = 'width' | 'height';

expect.extend({
  toMatchImage(src, fixtureSrc) {
    const { isNot } = this;
    if (isNot) {
      throw new Error('isNot is not supported in match Image expectations');
    }
    try {
      const [upscaledImage, fixture] = getImageBuffers(src, fixtureSrc);
      const mismatches: Dimension[] = [];
      for (const key of ['width', 'height'] as Dimension[]) {
        const fixtureDim = fixture[key];
        const upscaledDim = upscaledImage[key];
        if (fixtureDim !== upscaledDim) {
          mismatches.push(key);
        }
      }
      if (mismatches.length) {
        return {
          pass: false,
          message: () => {
            return [
              `Mismatch in ${pluralize(mismatches, 'and')} dimensions.`,
              `Upscaled Image: ${upscaledImage.width}x${upscaledImage.height}`,
              `Fixture Image:  ${fixture.width}x${fixture.height}`,
            ].join('\n');
          },
        }
      }
      const diff = new PNG({ width: fixture.width, height: fixture.height });
      const mismatched = pixelmatch(fixture.data, upscaledImage.data, diff.data, fixture.width, fixture.height, { threshold: THRESHOLD });
      if (mismatched > 0) {
        const diffOutput = `data:image/png;base64,${PNG.sync.write(diff).toString('base64')}`;
        return {
          pass: false,
          message: () => `Images do not match. Diff output:\n${diffOutput}\n`,
        }
      }
      return {
        pass: true,
        message: () => {
          return `Images do not match.`;
        },
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        const msg = err.message;
        return {
          pass: false,
          message: () => msg,
        }
      }
      throw err;
    }
  }
})

