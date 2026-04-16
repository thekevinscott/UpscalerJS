# Port to ONNX — decision summary

**Recommendation: port.**  Short version: the library it's built on
(TF.js) has stopped shipping, the replacement (ONNX Runtime Web) is
being actively invested in, and the perf cost of moving is survivable.

Full technical writeup: [`README.md`](./README.md).
Benchmark harness and raw numbers: [`benchmark/`](./benchmark/).

---

## What the data says

**Maintenance (primary sources, verified 2026-04-16):**

| | @tensorflow/tfjs | onnxruntime-web |
|---|---|---|
| Last stable release | 4.22.0 · 2024-10-21 | 1.24.3 · 2026-03-05 |
| Releases in last 18 months | 0 | 11 |
| Active feature work | chore/infra only | WebGPU, WebNN, FlashAttention, quant |
| Vendor | Google (de-prioritised) | MS + Intel + NVIDIA + Apple + AMD |
| Ecosystem position | JavaScript-only | HF Transformers.js v3, PyTorch export target, ONNX as industry exchange format |

**Performance (ESRGAN-medium x4, same weights, same parity):**

| Path | TF.js | ONNX | Winner |
|---|---|---|---|
| Node CPU patch-loop | 676 ms | 291 ms | ONNX 2.3× |
| Browser WASM patch-loop | 392 ms | 594 ms | TF.js 1.5× |
| Browser WebGL patch-loop | 183 ms | *n/a — static-shape issue* | TF.js |
| Browser WebGPU patch-loop (M3 Max) | 82 ms | 121 ms | TF.js 1.5× |

All paths produce numerically-correct output after the Concat-surgery
workaround (see [`benchmark/split-concat.py`](./benchmark/split-concat.py);
the unpatched ONNX silently returns garbage on Apple Metal).

## What this means

- Browser users see a **~1.5× latency regression** on today's model + hardware.
- Node/server users see a **~2.3× speedup**.
- The 1.5× browser gap is the measured state today.  It is not a
  trajectory: ORT is shipping WebGPU improvements monthly, TFJS isn't.
- The long-term risk of staying on TFJS is a dependency that silently
  rots under the library — browser APIs evolve, Node APIs evolve,
  Apple-Silicon builds break, and there's no upstream to ship fixes.

## What the port costs

**Technical surface (summary — full matrix in [`README.md`](./README.md)):**

- **No public API change for users.**  The factory pattern already in
  `packages/upscalerjs` was designed for this; `backend: 'onnx'`
  becomes a new constructor option, default stays `tfjs` for v2.0.
- **A small tensor-ops module becomes ours.**  `tf.slice`, `tf.concat`,
  `tf.zeros`, `tf.image.resizeBilinear` don't exist in the ORT JS API.
  ~200 lines of hand-rolled ops.  Already prototyped in
  [`src/shared/tensor-utils.ts`](./src/shared/tensor-utils.ts).
- **Every model package that defines `preprocess`/`postprocess` forks**
  to add an ONNX variant.  Concretely:
  - Convert cleanly via `tf2onnx`: `esrgan-medium`, `esrgan-slim`,
    `esrgan-legacy/psnr-small`, all `maxim-*` variants (to be verified),
    `pixel-upsampler`.
  - Need Python-side custom-layer work before conversion:
    `esrgan-thick` (MultiplyBeta + PixelShuffle4x), `esrgan-legacy/gans`.
  - `default-model` needs to be re-published as an ONNX asset.
- **One permanent upstream bug we need to work around** until ORT-Web
  fixes it: wide Concat on adapters with
  `maxStorageBuffersPerShaderStage=8` (Apple, tier-1 mobile).
  [`benchmark/split-concat.py`](./benchmark/split-concat.py) does the
  rewrite; it becomes part of the model build pipeline.
- **Tests rewritten to mock `ort.InferenceSession`** instead of `tf.*`.
  ~1000 lines mechanical.
- **Build targets simplify.**  `onnxruntime-node` collapses CPU + GPU +
  TensorRT + CoreML + DirectML into one package with runtime provider
  selection, replacing the `tfjs-node` / `tfjs-node-gpu` split.

**Impact on you:**

- A week or two of focused work for the dual-backend scaffolding.
- Ongoing per-model conversion work — each existing UpscalerJS model
  needs an ONNX export and any custom-layer logic re-authored in
  Python.  Likely 1–2 days per model for clean converts, longer for
  the custom-layer ones.
- You own a small tensor-ops module forever.  Not glamorous.
- You inherit responsibility for the Concat workaround until ORT-Web
  fixes it (or you upstream the fix yourself).

**Impact on users:**

- v2.0 ships with `backend: 'tfjs'` as default → **zero behavioural
  change** for existing users on release day.
- When a user opts into `backend: 'onnx'`, they get:
  - ~1.5× slower browser inference on this model + hardware today
  - access to the ONNX model zoo (Real-ESRGAN, SwinIR, EDSR, HAT,
    etc. without re-conversion)
  - single `.onnx` file instead of `model.json` + weight shards
  - Node/server users: 2.3× faster inference
- When ONNX becomes the default (v3.0 or later), the browser regression
  becomes visible to everyone — hopefully smaller by then as ORT-Web
  ships more WebGPU work.

## Rollout shape

The existing `packages/upscalerjs-onnx/` spike already contains most of
the skeleton for a dual-backend single-package v2.  Outline:

1. **v2.0** — dual-backend, TFJS default.  `Upscaler({ backend: 'onnx', model })`
   works; existing API unchanged.  Ship 1–2 headline ONNX models.
2. **v2.x** — port the rest of the model catalogue opportunistically.
   No user-visible breaking changes.
3. **v3.0** — promote ONNX to default once model coverage is there.
   Semver-major.
4. **Later** — retire TFJS path when usage drops.

Costs of dual-backend (bundle ~2× baseline, maintenance ~1.5×) are
documented in the full writeup.  Dynamic-import gating keeps most users
paying for only the backend they use.

## Alternatives considered and rejected

- **Stay on TFJS.**  The library rots under you.  Not a plan.
- **Build your own tensor library.**  Months per op, ~30 ops in ESRGAN
  alone, no strategic moat, users don't care what's underneath.
- **Abandon UpscalerJS.**  Defensible if you're done with it, but not
  the question on the table.
- **Replace-backend (drop TFJS, ship ONNX-only at v2).**  Cleaner
  codebase, but a day-one latency regression for every existing user
  plus a simultaneous port of every model package.  Too much blast
  radius at once.

## What needs a decision from you

1. **Go / no-go on v2.0 dual-backend.**  This doc assumes "go".
2. **Which 1–2 models ship with ONNX on day one.**  Recommend
   esrgan-medium (proven-to-convert) + default-model (so
   `new Upscaler()` with no args works on the ONNX path too).
3. **Budget for model-side custom-layer work.**  `esrgan-thick` is the
   main cost centre; if it's not shipping on ONNX for v2, the rollout
   gets easier but some users will want it.
