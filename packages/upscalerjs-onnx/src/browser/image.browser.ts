/**
 * Browser image I/O for the ONNX backend.
 *
 * Counterpart to `packages/upscalerjs/src/browser/image.browser.ts`. Same
 * responsibilities (input coercion → float32 NHWC tensor, tensor → base64
 * data URL, environment validation), but:
 *
 *   - No `tf.browser.fromPixelsAsync()` — we draw to a `<canvas>` and read
 *     back `ImageData.data` directly. This is exactly what tfjs does under
 *     the hood; we just inline the step.
 *   - Output rendering is identical (ImageData → canvas → data URL).
 */
import type { CheckValidEnvironment, GetImageAsTensor, TensorAsBase64, } from '../shared/types';
import { Tensor, } from '../shared/tensor';

export type Input = HTMLImageElement | HTMLCanvasElement | ImageData | ImageBitmap | Tensor | string;

const loadImageFromUrl = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Failed to load image'));
});

const drawToCanvas = (
  source: HTMLImageElement | HTMLCanvasElement | ImageData | ImageBitmap,
): { data: Uint8ClampedArray; width: number; height: number; } => {
  const canvas = document.createElement('canvas');
  const { width, height, } = (() => {
    if (source instanceof ImageData) { return { width: source.width, height: source.height, }; }
    if ('width' in source && 'height' in source) { return { width: source.width, height: source.height, }; }
    return { width: 0, height: 0, };
  })();
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { throw new Error('Could not get 2D canvas context'); }
  if (source instanceof ImageData) {
    ctx.putImageData(source, 0, 0);
  } else {
    // HTMLImageElement | HTMLCanvasElement | ImageBitmap all work with drawImage
    ctx.drawImage(source as CanvasImageSource, 0, 0);
  }
  const imageData = ctx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height, };
};

/**
 * RGBA Uint8 (0-255) → NHWC float32 RGB tensor (0-255).
 * Drops the alpha channel to match the tfjs `fromPixels` default.
 */
const pixelsToTensor = (data: Uint8ClampedArray, width: number, height: number): Tensor => {
  const out = new Float32Array(height * width * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    out[j]     = data[i];
    out[j + 1] = data[i + 1];
    out[j + 2] = data[i + 2];
  }
  return new Tensor(out, [1, height, width, 3,]);
};

export const getImageAsTensor: GetImageAsTensor<Input> = async (input) => {
  if (input instanceof Tensor) {
    return input.rank === 3 ? input.expandDims() : input;
  }
  const source = typeof input === 'string' ? await loadImageFromUrl(input) : input;
  const { data, width, height, } = drawToCanvas(source);
  return pixelsToTensor(data, width, height);
};

export const tensorAsBase64: TensorAsBase64 = (t) => {
  const s = t.squeeze();
  if (s.rank !== 3 || s.shape[2] !== 3) {
    throw new Error(`tensorAsBase64 expects HWC-3 tensor, got shape ${JSON.stringify(s.shape)}`);
  }
  const [height, width,] = s.shape;
  const rgba = new Uint8ClampedArray(height * width * 4);
  for (let i = 0, j = 0; i < s.data.length; i += 3, j += 4) {
    rgba[j]     = s.data[i];
    rgba[j + 1] = s.data[i + 1];
    rgba[j + 2] = s.data[i + 2];
    rgba[j + 3] = 255;
  }
  const imageData = new ImageData(rgba, width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { throw new Error('No 2D context'); }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};

export const checkValidEnvironment: CheckValidEnvironment<Input> = (input, { output = 'base64', progressOutput, }) => {
  const needsDom = typeof input === 'string' || output === 'base64' || progressOutput === 'base64';
  if (needsDom) {
    try {
      if (!(new Image() && 'createElement' in document)) { throw new Error(); }
    } catch {
      throw new Error('Environment does not support DOM APIs needed for base64 input/output.');
    }
  }
};
