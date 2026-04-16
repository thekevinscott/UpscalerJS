# Browser benchmark: tfjs vs onnxruntime-web

Same ESRGAN Medium x4 weights as the Node benchmark, run in headless
Chrome via Puppeteer against:

- `@tensorflow/tfjs-backend-wasm` (WASM, multi-threaded when COI is on)
- `onnxruntime-web` WASM execution provider (multi-threaded when COI is on)

WebGPU is **not** benchmarked here. The only WebGPU adapter available in a
headless-Chrome-on-Linux-in-a-container environment is SwiftShader, which
is a software emulation of GPU — any numbers would measure the emulator,
not the runtime. Real WebGPU results require a machine with an actual GPU.

## Setup

```sh
# Stage the model assets where the page expects them.
mkdir -p public/models/tfjs public/models/onnx public/vendor/tfjs public/vendor/ort
cp ../../../../models/esrgan-medium/models/x4/* public/models/tfjs/
cp /path/to/esrgan_medium_x4.onnx public/models/onnx/model.onnx

# Copy runtime assets. Exact filenames depend on the version.
cp node_modules/@tensorflow/tfjs/dist/tf.min.js public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.min.js public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm public/vendor/tfjs/
cp node_modules/onnxruntime-web/dist/ort.min.js public/vendor/ort/
cp node_modules/onnxruntime-web/dist/*.{mjs,wasm} public/vendor/ort/

cp ../../../../assets/flower.png public/input.png

npm install
npm run bench
```

The driver serves `public/` with COOP/COEP headers (required for multi-
threaded WASM via `SharedArrayBuffer`), launches headless Chrome, runs the
page, and prints results.

## Results (in-browser, CPU via WASM)

```
hardwareConcurrency: 16, crossOriginIsolated: true, multi-threaded WASM
tfjs 4.22, onnxruntime-web 1.24

Cold start:
  tfjs-wasm  setBackend+loadLayersModel   ~218 ms
  ort-wasm   InferenceSession             ~1930 ms      (WASM compile dominates)

Single-call inference (median of 5, after 2 warmup):
  32  → 128    tfjs ~23 ms    ort ~318* ms
  64  → 256    tfjs ~61 ms    ort ~72 ms

Patch-loop (8 × 64² patches — end-to-end pipeline cost):
  tfjs-wasm  474 ms   (59 ms/patch)
  ort-wasm   624 ms   (78 ms/patch)
  → tfjs-wasm is ~1.3× faster here

* ORT's 32→128 median has large variance (min 22 ms, max 324 ms). Looks
  like warmup=2 isn't long enough for ORT to settle — bump warmup if you
  care about the small-tile number specifically. The larger sizes are stable.
```

## What this means (and doesn't)

Direct comparison against the Node numbers in `../README.md`:

| path                        | patch-loop speedup | who wins       |
| --------------------------- | ------------------ | -------------- |
| Node CPU (tfjs-node vs ORT) | 2.3×               | ONNX           |
| Browser WASM (tfjs-wasm vs ort-wasm) | 1.3×      | **TF.js**      |
| Browser WebGPU              | not measured here  | ?              |

The Node result doesn't transfer to browser users on WASM. Two likely
reasons:

1. **`tfjs-node` isn't `tfjs-wasm`.** tfjs-node uses the native C++
   TensorFlow runtime; onnxruntime-node uses the native C++ ORT runtime.
   Both are compiled kernels talking through bindings. In-browser, both
   are WASM builds, and the kernel-quality comparison is different.
2. **ORT's WASM cold-start is expensive** — ~2 s to compile the WASM
   bundle. This is one-time cost per page load, but it's big.

This doesn't negate the Node speedup or the case for ONNX long-term. It
*does* mean the perf argument for ONNX in the browser hinges on **WebGPU**,
not WASM, and that's the measurement still missing. On a machine with a
real GPU, the comparison we actually need is:

- tfjs-webgpu (or tfjs-webgl fallback)
- onnxruntime-web with the WebGPU execution provider

If ORT's WebGPU EP outperforms tfjs-webgpu by a meaningful margin on this
model, the browser story lines up with the Node story. If it doesn't, then
the browser migration is a wash on perf and the argument for ONNX has to
rest on other grounds (larger model zoo, simpler packaging, vendor support,
Node speedups for server-side use).
