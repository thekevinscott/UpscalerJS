/**
 * Minimal tensor abstraction over `onnxruntime-*`'s `ort.Tensor`.
 *
 * ONNX Runtime's Tensor is a thin data container (typed array + shape + dtype) —
 * it has **no slice/concat/pad/tidy ops** the way `@tensorflow/tfjs` does.
 *
 * In TF.js the Upscaler pipeline leans heavily on `tf.slice`, `tf.concat`,
 * `tf.zeros`, and `tf.tidy` for patching, padding and memory management.
 * When we swap the backend to ONNX, those operations move into user-space JS.
 *
 * This module is where that cost lives. It's small, pure, and testable — but
 * it *is* meaningful extra surface area the library has to own and maintain.
 *
 * Shapes follow tfjs convention: `[batch, height, width, channels]` (NHWC).
 * Note: many ONNX models expect NCHW — conversion happens at the model boundary
 * in `executeModel()`.
 */
import type { Tensor as OrtTensor, } from 'onnxruntime-common';

export type Shape3D = [number, number, number];
export type Shape4D = [number, number, number, number];

/**
 * A lightweight NHWC float32 tensor. Conceptually equivalent to tfjs's
 * `Tensor3D | Tensor4D`, but without the compute graph / autograd machinery.
 *
 * We keep things flat: one typed array, explicit shape. Memory is freed by
 * the GC — there's no `.dispose()` contract the way tfjs requires.
 */
export class Tensor {
  readonly data: Float32Array;
  readonly shape: number[];

  constructor(data: Float32Array, shape: number[]) {
    const expected = shape.reduce((a, b) => a * b, 1);
    if (data.length !== expected) {
      throw new Error(`Tensor data length ${data.length} does not match shape ${JSON.stringify(shape)} (expected ${expected})`);
    }
    this.data = data;
    this.shape = shape;
  }

  get rank(): number { return this.shape.length; }

  /**
   * Convert to the `ort.Tensor` type the ONNX Runtime session expects.
   * Optionally transposes NHWC → NCHW for models that require channels-first.
   */
  async toOrt(layout: 'nhwc' | 'nchw' = 'nhwc'): Promise<OrtTensor> {
    const { Tensor: OrtTensorCtor, } = await import('onnxruntime-common');
    if (layout === 'nhwc' || this.rank !== 4) {
      return new OrtTensorCtor('float32', this.data, this.shape);
    }
    const [n, h, w, c,] = this.shape as Shape4D;
    const out = new Float32Array(n * c * h * w);
    // NHWC → NCHW
    for (let ni = 0; ni < n; ni++) {
      for (let hi = 0; hi < h; hi++) {
        for (let wi = 0; wi < w; wi++) {
          for (let ci = 0; ci < c; ci++) {
            const src = ((ni * h + hi) * w + wi) * c + ci;
            const dst = ((ni * c + ci) * h + hi) * w + wi;
            out[dst] = this.data[src];
          }
        }
      }
    }
    return new OrtTensorCtor('float32', out, [n, c, h, w,]);
  }

  /**
   * Build a Tensor from an `ort.Tensor`, converting NCHW → NHWC if needed.
   */
  static fromOrt(ort: OrtTensor, layout: 'nhwc' | 'nchw' = 'nhwc'): Tensor {
    const data = ort.data as Float32Array;
    const shape = [...ort.dims,];
    if (layout === 'nhwc' || shape.length !== 4) {
      return new Tensor(data, shape);
    }
    const [n, c, h, w,] = shape;
    const out = new Float32Array(n * h * w * c);
    for (let ni = 0; ni < n; ni++) {
      for (let ci = 0; ci < c; ci++) {
        for (let hi = 0; hi < h; hi++) {
          for (let wi = 0; wi < w; wi++) {
            const src = ((ni * c + ci) * h + hi) * w + wi;
            const dst = ((ni * h + hi) * w + wi) * c + ci;
            out[dst] = data[src];
          }
        }
      }
    }
    return new Tensor(out, [n, h, w, c,]);
  }

  /**
   * Squeeze leading batch dim (rank-4 NHWC → rank-3 HWC).
   */
  squeeze(): Tensor {
    if (this.rank === 4 && this.shape[0] === 1) {
      return new Tensor(this.data, this.shape.slice(1));
    }
    return this;
  }

  /**
   * Expand dims (HWC → NHWC with N=1).
   */
  expandDims(): Tensor {
    return new Tensor(this.data, [1, ...this.shape,]);
  }
}
