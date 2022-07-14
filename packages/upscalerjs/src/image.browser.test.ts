import { loadImage, isHTMLImageElement, getImageAsTensor, getInvalidImageError, getInvalidTensorError, } from './image.browser';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as tf from '@tensorflow/tfjs';

chai.use(chaiAsPromised);
const { expect } = chai;

const FLOWER_SMALL = 'data:image/png;base64,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';
const getExpectedArray = (src: string, width = 16, height = 16): Promise<Uint8ClampedArray> => new Promise(resolve => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = width,
  canvas.height = height;

  const image = new Image();
  image.onload = () => {
    if (!ctx) {
      throw new Error('ctx is null');
    }
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, width, height);
    resolve(data);
  };
  image.src = src;
});

describe('Image', async () => {
  let expectedArray: Uint8ClampedArray;

  before(async () => {
    expectedArray = await getExpectedArray(FLOWER_SMALL);
  });
  describe('getImageAsTensor', () => {
    it('loads an Image() if given a string as input', async () => {
      const tensor = await getImageAsTensor(FLOWER_SMALL);
      const result = await tf.browser.toPixels(tensor.squeeze() as tf.Tensor3D)
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expectedArray));
    });

    it('handles a rejected Image() if given a string as input', async () => {
      return getImageAsTensor('foobar')
        .then(() => { throw new Error('was not supposed to succeed'); })
        .catch(m => expect(m.message).to.equal(getInvalidImageError().message));
    });

    it('reads a given Image() directly', async () => {
      const img = await loadImage(FLOWER_SMALL);
      const tensor = await getImageAsTensor(img);
      const result = await tf.browser.toPixels(tensor.squeeze() as tf.Tensor3D)
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expectedArray));
    });

    it('reads a rank 4 tensor directly without manipulation', async () => {
      const input: tf.Tensor4D = tf.tensor([[[[1,],],],]);
      const tensor = await getImageAsTensor(input);
      expect(input.dataSync()).to.deep.equal(tensor.dataSync());
      input.dispose();
    });

    it('reads a rank 3 tensor and expands to rank 4', async () => {
      const input: tf.Tensor3D = tf.tensor([[[1,],],]);
      const tensor = await getImageAsTensor(input);
      expect(tensor.shape).to.deep.equal([1,1,1,1,]);
      input.dispose();
    });

    it('handles an invalid (too small) tensor input', async () => {
      const input = tf.tensor([[1,],]);
      return getImageAsTensor(input as any)
        .then(() => { throw new Error('was not supposed to succeed'); })
        .catch(m => {
          input.dispose();
          expect(m.message).to.equal(getInvalidTensorError(input).message);
        });
    });

    it('handles an invalid (too large) tensor input', async () => {
      const input = tf.tensor([[[[[1,],],],],]);
      return getImageAsTensor(input as any)
        .then(() => { throw new Error('was not supposed to succeed'); })
        .catch(m => {
          input.dispose();
          expect(m.message).to.equal(getInvalidTensorError(input).message);
        });
    });
  });
});

describe('isHTMLImageElement', () => {
  it('returns true for an HTMLImageElement', () => {
    const img = new Image();
    expect(isHTMLImageElement(img)).to.equal(true);
  });

  it('returns false for a non HTMLImageElement', () => {
    expect(isHTMLImageElement('foo')).to.equal(false);
  });
});
