/**
 * Tensor ops that the tfjs-backed Upscaler gets for free from `@tensorflow/tfjs`
 * but which we must now implement ourselves.
 *
 * These are straightforward typed-array gymnastics on NHWC tensors, but they
 * illustrate the headline cost of the ONNX migration: **every helper that was
 * a one-liner like `tf.slice(t, [...], [...])` is now tens of lines of manual
 * index math**.
 *
 * Counterpart to `packages/upscalerjs/src/shared/tensor-utils.ts` in the tfjs
 * implementation.
 */
import { Tensor, type Shape4D, } from './tensor';

/** Slice a rank-4 NHWC tensor: `[batch, h, w, c]`. `size: -1` means "to end". */
export const slice4D = (t: Tensor, begin: [number, number, number, number,], size: [number, number, number, number,]): Tensor => {
  if (t.rank !== 4) { throw new Error('slice4D requires rank-4 tensor'); }
  const [n, h, w, c,] = t.shape as Shape4D;
  const [bn, bh, bw, bc,] = begin;
  const [_sn, _sh, _sw, _sc,] = size;
  const sn = _sn === -1 ? n - bn : _sn;
  const sh = _sh === -1 ? h - bh : _sh;
  const sw = _sw === -1 ? w - bw : _sw;
  const sc = _sc === -1 ? c - bc : _sc;
  const out = new Float32Array(sn * sh * sw * sc);
  let di = 0;
  for (let ni = 0; ni < sn; ni++) {
    for (let hi = 0; hi < sh; hi++) {
      for (let wi = 0; wi < sw; wi++) {
        const srcRowStart = (((bn + ni) * h + (bh + hi)) * w + (bw + wi)) * c + bc;
        for (let ci = 0; ci < sc; ci++) {
          out[di++] = t.data[srcRowStart + ci];
        }
      }
    }
  }
  return new Tensor(out, [sn, sh, sw, sc,]);
};

/** Concat along a given axis. Shapes must match on every other axis. */
export const concat4D = (tensors: Array<Tensor | undefined>, axis: number): Tensor => {
  const defined = tensors.filter((t): t is Tensor => t !== undefined);
  if (defined.length === 0) { throw new Error('concat4D: no tensors'); }
  if (defined.length === 1) { return defined[0]; }
  // Validate ranks.
  if (defined.some(t => t.rank !== 4)) { throw new Error('concat4D requires rank-4'); }
  const refShape = defined[0].shape.slice();
  let axisTotal = 0;
  for (const t of defined) {
    for (let i = 0; i < 4; i++) {
      if (i !== axis && t.shape[i] !== refShape[i]) {
        throw new Error(`concat4D shape mismatch on axis ${i}`);
      }
    }
    axisTotal += t.shape[axis];
  }
  const outShape = refShape.slice();
  outShape[axis] = axisTotal;
  const out = new Float32Array(outShape.reduce((a, b) => a * b, 1));
  // General-purpose copy via flat iteration. Correctness > speed for a spike.
  const strides = (shape: number[]) => {
    const s = new Array(shape.length).fill(1);
    for (let i = shape.length - 2; i >= 0; i--) { s[i] = s[i + 1] * shape[i + 1]; }
    return s;
  };
  const outStrides = strides(outShape);
  let axisOffset = 0;
  for (const t of defined) {
    const tStrides = strides(t.shape);
    const [n, h, w, c,] = t.shape as Shape4D;
    for (let ni = 0; ni < n; ni++) {
      for (let hi = 0; hi < h; hi++) {
        for (let wi = 0; wi < w; wi++) {
          for (let ci = 0; ci < c; ci++) {
            const src = ni * tStrides[0] + hi * tStrides[1] + wi * tStrides[2] + ci * tStrides[3];
            const dstCoord = [ni, hi, wi, ci,];
            dstCoord[axis] += axisOffset;
            const dst =
              dstCoord[0] * outStrides[0] +
              dstCoord[1] * outStrides[1] +
              dstCoord[2] * outStrides[2] +
              dstCoord[3] * outStrides[3];
            out[dst] = t.data[src];
          }
        }
      }
    }
    axisOffset += t.shape[axis];
  }
  return new Tensor(out, outShape);
};

/**
 * Right/bottom-pad a rank-4 NHWC tensor to a fixed shape with zeros. Used
 * when the model has a fixed input size but the image patch is smaller.
 */
export const padTo = (t: Tensor, target: Shape4D): Tensor => {
  const [n, h, w, c,] = t.shape as Shape4D;
  const [tn, th, tw, tc,] = target;
  if (n > tn || h > th || w > tw || c > tc) {
    throw new Error('padTo: target smaller than source');
  }
  const out = new Float32Array(tn * th * tw * tc);
  for (let ni = 0; ni < n; ni++) {
    for (let hi = 0; hi < h; hi++) {
      for (let wi = 0; wi < w; wi++) {
        const srcRow = ((ni * h + hi) * w + wi) * c;
        const dstRow = ((ni * th + hi) * tw + wi) * tc;
        for (let ci = 0; ci < c; ci++) {
          out[dstRow + ci] = t.data[srcRow + ci];
        }
      }
    }
  }
  return new Tensor(out, [...target,]);
};

/** Rescale from one numeric range to another (e.g. [0,255] → [0,1]). */
export const rescale = (t: Tensor, from: [number, number,] | undefined, to: [number, number,]): Tensor => {
  if (!from) { return t; }
  const [fromLo, fromHi,] = from;
  const [toLo, toHi,] = to;
  const scale = (toHi - toLo) / (fromHi - fromLo);
  const out = new Float32Array(t.data.length);
  for (let i = 0; i < t.data.length; i++) {
    out[i] = (t.data[i] - fromLo) * scale + toLo;
  }
  return new Tensor(out, t.shape);
};

/** Clamp tensor values to `[lo, hi]`. */
export const clamp = (t: Tensor, lo: number, hi: number): Tensor => {
  const out = new Float32Array(t.data.length);
  for (let i = 0; i < t.data.length; i++) {
    const v = t.data[i];
    out[i] = v < lo ? lo : v > hi ? hi : v;
  }
  return new Tensor(out, t.shape);
};
