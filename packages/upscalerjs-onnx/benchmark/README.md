# End-to-end benchmark: TF.js vs ONNX Runtime for UpscalerJS

Apples-to-apples benchmark of the same super-resolution model (ESRGAN Medium x4,
~705k params) run through `@tensorflow/tfjs-node` and `onnxruntime-node` on CPU.
Same weights (converted from the same Keras source), same NHWC layout, same
`[0, 1]` normalisation, same input image.

## Setup

```sh
# 1. Convert the tfjs layers model to ONNX.
#    See convert-tfjs-to-onnx.py for the Python env setup; the README caveats
#    about tfjs_graph_converter / custom layers apply here.
python convert-tfjs-to-onnx.py \
  ../../../models/esrgan-medium/models/x4/model.json \
  ./models/onnx/model.onnx

# 2. Drop the tfjs model next to it so both runtimes load from this dir.
cp -r ../../../models/esrgan-medium/models/x4 ./models/tfjs

# 3. Drop a test image.
cp ../../../assets/flower.png ./input.png

# 4. Install node deps and run.
npm install
node bench.mjs
```

`verify-parity.py` independently compares the Keras output vs the ONNX output
for the same input — expect `max abs diff ≈ 1e-6`.

## Results (128 → 512 upscale, ESRGAN Medium x4)

```
Model: esrgan-medium x4 (~705k params, 2.8 MB)
Hardware: CPU (tfjs-node + onnxruntime-node)
Warmup: 3 iters, measured: 10 iters per size

Load times:
  TF.js    backend init  764.5 ms   loadLayersModel  35.1 ms   total  799.5 ms
  ONNX RT  import         34.1 ms   InferenceSession 60.2 ms   total   94.3 ms

Inference (median of 10, after 3 warmup):
  size       TF.js median   ONNX median    speedup   maxAbsDiff
  32  → 128    32.5 ms         5.4 ms       6.01×    1.01e-6 (match)
  64  → 256    47.3 ms        17.9 ms       2.64×    1.25e-6 (match)
  128 → 512    67.0 ms        68.6 ms       0.98×    1.67e-6 (match)

Patch-loop simulation (16 × 64×64 patches — mirrors the upscale pipeline):
  TF.js  16 patches:  676.3 ms  (42.3 ms/patch)
  ONNX   16 patches:  291.3 ms  (18.2 ms/patch)
  speedup (patch loop): 2.32×
```

## What this shows

1. **Output parity is float-precision.** Max absolute difference between TF.js
   and ONNX outputs is ~1.7e-6 across every size tested — indistinguishable
   in practice. Weights convert cleanly via `tf2onnx`.

2. **Cold-start: ONNX ~8.5× faster.** `tfjs-node` takes ~750 ms to init its
   backend before the first `loadLayersModel` call; `onnxruntime-node` boots
   in under 100 ms end-to-end. For a library whose users hit “upscale” once,
   this is the most visible user-facing win.

3. **Single-call inference: ONNX wins on small tiles, ties on large ones.**
   At 32×32 input, ONNX is ~6× faster; at 128×128 they converge (both backends
   hit the same underlying CPU kernels and get compute-bound). The gap at small
   sizes is **per-call dispatch overhead** in tfjs-node, not kernel quality.

4. **Patch-loop workload: ~2.3× faster end-to-end.** UpscalerJS's real-world
   inference path runs the model dozens of times over tiled patches of the
   input image. Per-call overhead compounds. With 16 × 64×64 patches, ONNX
   finishes in 291 ms vs TF.js's 676 ms. This is the number that actually
   matters for end-user latency.

## Caveats on these numbers

- Single CPU, single machine, one model. Real deployments vary.
- ESRGAN-Medium x4 is a comparatively small model (~2.8 MB, 64 layers). For
  a larger model (e.g. esrgan-thick x4, ~28 MB, 477 layers) the compute cost
  grows relative to per-call overhead, so the gap at large tile sizes may
  widen or narrow — needs re-measuring.
- Browser numbers (`onnxruntime-web` with WebGPU vs `@tensorflow/tfjs` with
  WebGL/WebGPU) will look different. This benchmark only addresses Node/CPU.
- The tfjs-node numbers here use the AVX2/AVX512-optimised build; on a machine
  without modern CPU features the relative ordering could shift.
- `esrgan-medium` was chosen because it has no custom Keras layers and
  converts cleanly. `esrgan-thick` couldn't be converted with this pipeline —
  its `MultiplyBeta` and `PixelShuffle4x` custom layers would need to be
  re-authored in Python first. That's the "custom ops" migration cost called
  out in the spike README.
