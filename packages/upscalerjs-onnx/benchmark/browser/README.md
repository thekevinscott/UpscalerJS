# Browser benchmark: tfjs vs onnxruntime-web (full backend matrix)

Runs the same ESRGAN Medium x4 weights as the Node benchmark against every
backend the browser exposes:

| backend              | runs |
| -------------------- | ---- |
| TF.js CPU            | reference only (pure JS — very slow; capped at 32×32) |
| TF.js WASM           | always (multi-threaded when COI is on) |
| TF.js WebGL          | if non-software WebGL is available |
| TF.js WebGPU         | if non-software WebGPU adapter is available |
| onnxruntime-web WASM | always |
| onnxruntime-web WebGL EP | if non-software WebGL is available |
| onnxruntime-web WebGPU EP | if non-software WebGPU adapter is available |
| onnxruntime-web WebNN EP | if `navigator.ml` is available (Chrome Canary + flag) |

Each backend records cold-start load time, per-size inference median
(p25/p75/min/max), patch-loop wall time (8 × 64² patches), and a parity
check against whichever backend ran first successfully (loose 5e-3
threshold since GPU kernels legitimately differ from CPU).

## Setup

```sh
# Stage the model assets where the page expects them.
mkdir -p public/models/tfjs public/models/onnx public/vendor/tfjs public/vendor/ort
cp ../../../../models/esrgan-medium/models/x4/* public/models/tfjs/
cp /path/to/esrgan_medium_x4.onnx public/models/onnx/model.onnx

# Runtime assets (exact filenames depend on version).
cp node_modules/@tensorflow/tfjs/dist/tf.min.js public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.min.js public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-webgpu/dist/tf-backend-webgpu.min.js public/vendor/tfjs/
# onnxruntime-web: use the "all" bundle so every EP (wasm/webgl/webgpu/webnn) is included
cp node_modules/onnxruntime-web/dist/ort.all.min.js public/vendor/ort/
cp node_modules/onnxruntime-web/dist/*.{mjs,wasm} public/vendor/ort/

cp ../../../../assets/flower.png public/input.png

npm install
npm run bench
```

The driver serves `public/` with COOP/COEP headers (required for
multi-threaded WASM via `SharedArrayBuffer`), launches headless Chrome
with `--enable-unsafe-webgpu`, runs the page, and dumps the result JSON.

## Running on a real-GPU laptop

The headless Chrome box in CI/containers usually has only SwiftShader
(software WebGPU) and llvmpipe (software WebGL). The harness detects
these and skips the GPU backends automatically — timing a software
emulator is meaningless.

**To get real GPU numbers, run the page directly in a regular Chrome
on a machine with a GPU.** You can either:

1. Let the puppeteer driver do it: `npm run bench` still works on a
   real laptop; puppeteer will pick up the real GPU if available.
2. Point any static server at `public/` (must send COOP/COEP headers)
   and open `http://localhost:PORT/index.html` in your actual browser.

The results auto-render in a table. Two buttons are provided:

- **Copy JSON** — full result, for pasting into an issue/PR.
- **Copy Markdown table** — human-readable summary with system info.

## URL parameters

All of these are optional — the page picks sensible defaults.

| param       | default         | effect                                            |
| ----------- | --------------- | ------------------------------------------------- |
| `?sizes=`   | `32,64,128`     | comma-separated input sizes (square, RGB)         |
| `?warmup=`  | `3`             | warmup iterations before timed runs               |
| `?iters=`   | `10`            | timed iterations per size                          |
| `?patch=`   | `64`            | patch size for the patch-loop test                 |
| `?patches=` | `16`            | number of patches in the patch-loop                |
| `?timeout=` | `90000`         | per-backend timeout in ms (kills hung GPUs)       |
| `?forceGpu` | off             | attempt GPU backends even if the adapter looks like software emulation |
| `?manual`   | off             | don't autostart; wait for the "Start" link to be clicked |

Example:

```
http://localhost:4773/index.html?sizes=64,128,256&iters=20&warmup=5
```

## System info collected

The page captures and reports:

- `userAgent`, `platform`, `hardwareConcurrency`, `deviceMemory`
- `crossOriginIsolated` (needed for threaded WASM)
- WASM feature probe: `SharedArrayBuffer`, SIMD, threads
- WebGL: vendor, renderer, version, max texture size (via `WEBGL_debug_renderer_info`)
- WebGPU: adapter `vendor`, `architecture`, `device`, `description`,
  `features[]`, key `limits`
- `navigator.ml` (WebNN) presence
- Runtime versions for tfjs and onnxruntime-web
- Bundle bytes per file (so we can compare shipping cost)

## What we already know (from a no-GPU container run)

```
hardwareConcurrency: 16, crossOriginIsolated: true, multi-threaded WASM
tfjs 4.22, onnxruntime-web 1.17

Cold start:
  tfjs-wasm  setBackend+loadLayersModel   ~180–220 ms
  ort-wasm   InferenceSession             ~1.9 s       (WASM compile dominates)

Single-call inference (median of 10, after 3 warmup):
  32  → 128    tfjs ~17 ms    ort ~22 ms
  64  → 256    tfjs ~57 ms    ort ~71 ms
  128 → 512    tfjs ~218 ms   ort ~280 ms

Patch-loop (16 × 64² patches — end-to-end pipeline cost):
  tfjs-wasm  ~915 ms
  ort-wasm   ~1129 ms
  → tfjs-wasm is ~1.2× faster on WASM

All four GPU backends (tfjs-webgl, tfjs-webgpu, ort-webgl, ort-webgpu)
  → skipped (software adapter detected)
```

This is the fallback path. The comparison that actually matters for most
browser users — **tfjs-webgpu vs ort-webgpu**, and **ort-webnn** (which
hits CoreML/DirectML/TFLite via the OS) — requires a machine with a real
GPU and a current Chrome. That's what this harness is built for; the
WASM-only numbers above are the lower bound.

## Interpreting parity

Every successful backend's first sample (smallest size) is compared
against the reference backend (first to succeed — usually tfjs-cpu).
The threshold is `5e-3` max-abs because the ESRGAN-medium x4 model outputs
unbounded floats, and WebGPU/WebGL kernels can differ from CPU/WASM by
small amounts due to fused ops and fp32 accumulation order. Anything
above `5e-3` is flagged `DIFF` in the table and should be investigated
before trusting the timing.
