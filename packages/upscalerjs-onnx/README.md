# `@upscalerjs/onnx` — ONNX Runtime Web spike

> **Status: SPIKE. Not published. Not for production use.** This package
> exists to answer one question: *what would it take to swap UpscalerJS's
> backend from TensorFlow.js to ONNX Runtime Web, and what would that
> cost/buy us?*

It is a parallel, self-contained implementation of the core Upscaler class
and upscale pipeline that plugs `onnxruntime-web` in where the main
package uses `@tensorflow/tfjs`. Where possible it copies the tfjs package
file-for-file so the diff surface is the interesting thing.

## How to read this spike

Pair each file with its tfjs counterpart:

| ONNX spike                                               | TF.js original                                                   | What to notice                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| `src/shared/upscaler.ts`                                 | `packages/upscalerjs/src/shared/upscaler.ts`                     | Public API is **identical**                         |
| `src/shared/upscale.ts`                                  | `packages/upscalerjs/src/shared/upscale.ts`                      | Same control flow; different tensor ops             |
| `src/shared/tensor.ts`                                   | *(n/a — tfjs gives this for free)*                               | The cost of not having a tensor library             |
| `src/shared/tensor-utils.ts`                             | `packages/upscalerjs/src/shared/tensor-utils.ts`                 | `slice/concat/pad` hand-rolled                      |
| `src/shared/image-utils.ts`                              | `packages/upscalerjs/src/shared/image-utils.ts`                  | **Unchanged** — pure patch math                     |
| `src/browser/image.browser.ts`                           | `packages/upscalerjs/src/browser/image.browser.ts`               | Canvas-based pixel read-back, no `tf.browser.fromPixels` |
| `src/browser/loadModel.browser.ts`                       | `packages/upscalerjs/src/browser/loadModel.browser.ts`           | Single `.onnx` fetch vs. `model.json` + shards      |
| `src/models/real-esrgan-x4.ts`                           | `/models/esrgan-thick/src/x4/index.ts`                           | Same shape of model definition, fewer fields needed |

---

## Summary: Transformers.js vs ONNX Runtime Web vs TF.js (as it applies to UpscalerJS)

UpscalerJS needs a backend that runs **convolutional super-resolution
models** in the browser and Node, accepts image tensors, and gives
fine-grained control over patching/tiling for large inputs.

| Concern                        | TF.js (today)                              | ONNX Runtime Web (this spike)                         | Transformers.js                                  |
| ------------------------------ | ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------ |
| Target model family            | Anything convertible to TF.js layers/graph | Anything convertible to ONNX (CNN/GAN/Transformer/…)  | HF transformer models only                       |
| Image super-resolution support | ✅ ecosystem's native format                | ✅ Real-ESRGAN, SwinIR, EDSR, HAT all ship ONNX        | ❌ not the target domain                         |
| Tensor ops in-library          | ✅ full (`tf.slice`, `tidy`, etc.)          | ❌ data container only — we implement ops ourselves   | ✅ through the bundled ORT                       |
| Tokenizer/pipeline overhead    | none                                       | none                                                  | large (bundle cost UpscalerJS wouldn't use)      |
| WebGPU / WebGL                 | WebGPU (beta), WebGL                       | WebGPU (stable since 1.17), WASM (SIMD/Threads), WebNN | inherits ORT's providers                         |
| Node story                     | `tfjs-node`, `tfjs-node-gpu` (C++ bindings) | `onnxruntime-node` (C++ bindings) — more providers    | via `onnxruntime-node`                           |
| Model file format              | `model.json` + 4 MB weight shards          | single `.onnx` file                                   | `.onnx` + tokenizer assets                       |
| Ecosystem activity (2024–)     | slowing; tfjs-node deprecation signals     | active (Microsoft + broader industry)                 | active (HF)                                      |
| Fit for UpscalerJS             | ✅ already works                            | ✅ strongly recommended                               | ❌ wrong abstraction layer                        |

**Bottom line:** Transformers.js is the wrong abstraction for image
super-resolution — it's a pipeline library for transformer models. The
real choice is **stay on TF.js** vs **move to ONNX Runtime Web**.

---

## Measured speed: ESRGAN Medium x4 through both backends, Node/CPU

Full setup, scripts, and methodology in [`benchmark/`](./benchmark/README.md).
Both paths load the same weights (converted from the same Keras source via
`tf2onnx`); numerical outputs match to ~1.7e-6 across every size tested.

```
Model: esrgan-medium x4 (~705k params, 2.8 MB)
Hardware: CPU (tfjs-node 4.22 vs onnxruntime-node 1.17), NHWC layout

Load times (one-time):
  TF.js   backend init ~765 ms + loadLayersModel ~35 ms = ~800 ms
  ONNX    import ~35 ms + InferenceSession ~60 ms       = ~95 ms     (~8.5× faster cold-start)

Single-call inference (median of 10):
  32  → 128:  TF.js 30 ms   ONNX 5 ms    → 6.0× ONNX
  64  → 256:  TF.js 46 ms   ONNX 17 ms   → 2.6× ONNX
  128 → 512:  TF.js 67 ms   ONNX 68 ms   → tie (~1.0×)

Patch-loop (16 × 64×64 patches — mirrors the real upscale pipeline):
  TF.js  676 ms   ONNX 291 ms            → 2.3× ONNX end-to-end
```

What this tells us:

- **Cold-start and small tiles are ONNX's biggest wins.** Most of the gap is
  per-call dispatch overhead in tfjs-node, not kernel quality. At compute-bound
  sizes (128+) both backends land in the same ballpark.
- **The realistic workload favours ONNX ~2.3×.** UpscalerJS runs the model
  dozens of times per image via tile patching, so per-call overhead compounds.
- **This is Node/CPU only.** Browser numbers (onnxruntime-web WebGPU vs
  tfjs WebGL/WebGPU) and larger models will need their own measurements.
- **Only esrgan-medium converts cleanly.** esrgan-thick uses custom Keras
  layers (MultiplyBeta, PixelShuffle4x) that `tf2onnx` can't resolve without
  Python-side class definitions — a concrete instance of the "Hard #8"
  caveat below.

---

## What this spike shows is *easy*

1. **The public `Upscaler` API does not need to change.** The factory
   pattern `getUpscaler<TF, Input>(...)` in the existing codebase was
   designed for this — dependency injection at the platform-adapter level
   means we can slot a different runtime in without touching user call
   sites. In this spike, `src/shared/upscaler.ts` is line-for-line
   equivalent to the tfjs version, sans the `tf` generic parameter.

2. **Patch/tile logic is pure and portable.** `image-utils.ts` moves over
   unchanged. In a real migration we'd hoist it to `packages/shared`.

3. **Model loading is simpler.** One `.onnx` file replaces
   `model.json` + weight shards. CDN-fallback strategy stays the same.

4. **WebGPU is first-class.** `onnxruntime-web` 1.17+ ships stable
   WebGPU — typically 5–20× faster than WASM for conv-heavy models.
   That's a meaningful win for the core use case.

5. **No `tf.tidy()` discipline.** ORT tensors are GC-managed. Several
   classes of memory bugs that the tfjs pipeline has to carefully guard
   against (`yield [colTensor, upscaledTensor, prediction, ...]`
   bookkeeping in `upscale.ts`) simply disappear.

## What this spike shows is *hard*

1. **Tensor ops become user-space code.** `tf.slice`, `tf.concat`,
   `tf.zeros`, `tf.image.resizeBilinear`, and similar helpers the tfjs
   pipeline currently relies on don't exist in ONNX Runtime's JS API — it
   exposes `InferenceSession` only. We have to implement them (see
   `src/shared/tensor-utils.ts`). They're small, but they're new surface
   area to own, test, and optimise.

2. **NHWC ⇄ NCHW transposes at the model boundary.** Most ONNX SR models
   are NCHW; the library's internal tensor model is NHWC (to match tfjs).
   Transposing on every patch has a non-trivial cost we'd need to measure.
   This cost partially disappears if we adopt NCHW throughout.

3. **Model package breaking changes.** The `ModelDefinition.preprocess /
   postprocess` hooks take our local `Tensor` rather than `tf.Tensor4D`.
   This means **every `@upscalerjs/*` model package that defines custom
   pre/postprocess** (esrgan-thick, esrgan-medium, maxim-*, etc.) needs
   an ONNX-compatible variant. In the v2 dual-backend world those ship
   as parallel entries inside the same model package (e.g.
   `@upscalerjs/esrgan-thick` exports both `./tfjs/x4` and `./onnx/x4`)
   rather than separate packages.

4. **Default model.** There is no `@upscalerjs/default-model` equivalent
   in ONNX yet. The spike requires `model` to be passed explicitly —
   you'd need to convert the current default to ONNX and publish it.

5. **Node build targets.** The tfjs package currently ships three
   distributions (browser ESM, node CJS, node-gpu CJS). `onnxruntime-node`
   collapses CPU + GPU (CUDA, DirectML, CoreML, TensorRT) into a single
   package with runtime execution provider selection — **simpler**, but
   it's still a build-system change you'd need to plan.

6. **Testing.** The tfjs package has ~1000+ lines of unit tests that mock
   `tf.*`. Those need to be rewritten to mock `ort.InferenceSession` and
   the new tensor helpers. Not hard, but real effort.

7. **Bundle size.** `onnxruntime-web` with WASM+WebGPU providers is
   ~6 MB uncompressed (~2 MB gzipped). Comparable to full `@tensorflow/tfjs`
   (~5 MB uncompressed). Neither is small; both should be lazy-loaded.

8. **Custom ops.** If any existing `ModelDefinition` uses TF.js-specific
   ops in `setup(tf)` (e.g. `tf.depthToSpace`, custom layers) the model
   graph itself would need re-export. Grep for `tf.mul`, `tf.depthToSpace`,
   etc. in `/models/*` to size this. **Confirmed while running the
   benchmark:** `esrgan-thick` refused to convert via `tf2onnx` — it uses
   `MultiplyBeta` and `PixelShuffle4x` custom Keras layers (from the
   original RRDN implementation) that can't be deserialized without their
   Python class definitions. The smaller `esrgan-medium` is pure
   Conv2D+Activation and converted in one pass. So this caveat is real and
   touches real models: every `esrgan-thick*` variant and `esrgan-legacy/gans`
   would need custom-layer work before conversion. `esrgan-medium`,
   `esrgan-slim`, `esrgan-legacy/psnr-small` convert cleanly.

---

## Long-term maintenance picture

**TF.js today:**

- TF.js is steadily shrinking in Google's investment posture. `tfjs-node`
  receives infrequent updates; `tfjs-node-gpu` releases are sparse. The
  project is *not* abandoned, but momentum has slowed. Keeping up with
  modern Node versions and ARM/Apple-Silicon native builds has been a
  recurring pain for the UpscalerJS maintainers historically.
- The ecosystem of models *originally trained in* TF.js is small; in
  practice UpscalerJS converts from PyTorch/TF via `tensorflowjs_converter`.
  That converter itself is minimally maintained.

**ONNX Runtime going forward:**

- ONNX Runtime is a first-class Microsoft product, backed by a vendor
  coalition (Microsoft, Intel, NVIDIA, AMD, Apple via CoreML EP).
  Consistent quarterly releases, stable API.
- Every major training framework (PyTorch, TF, JAX, MLX) exports to ONNX
  cleanly. UpscalerJS would gain access to the much larger ONNX model
  zoo without re-conversion work.
- WebGPU execution provider is production-ready. WebNN is shipping.
  This is where browser-side ML performance investment is happening.
- One package spans browser + Node + mobile (React Native) + embedded.
  Currently UpscalerJS ships three separate dist targets; ONNX could
  collapse those to two, or even one with dynamic import.

**Risk factors for ONNX:**

- `onnxruntime-web` ships fat WASM binaries. Serving + preloading these
  needs documentation for users.
- Any model that relies on TF.js-specific tricks in its `setup()` hook
  needs re-authoring on the ONNX side.
- The library gains ownership of a small tensor-ops module. Not glamorous,
  but it's a permanent maintenance line item.

## Rollout: UpscalerJS 2.0, dual-backend, single package

Guiding constraint: **one `upscaler` package**, shipping both backends,
users opt in to ONNX per-instance. The existing TF.js path stays fully
supported so today's users don't pay for the migration on day one.

### Public API in v2

```ts
import Upscaler from 'upscaler';
import esrganX4 from '@upscalerjs/esrgan-thick/tfjs/x4';      // existing
import realEsrganX4 from '@upscalerjs/esrgan-thick/onnx/x4';   // new

// Default backend: tfjs (unchanged from v1).
const a = new Upscaler({ model: esrganX4 });

// Opt in to ONNX.
const b = new Upscaler({ backend: 'onnx', model: realEsrganX4 });
```

Same `Upscaler` class, same methods, same overload set. The only new
surface is a `backend?: 'tfjs' | 'onnx'` option on the constructor,
defaulting to `'tfjs'`.

### Package layout

```
packages/upscalerjs/
├── src/
│   ├── shared/               # backend-agnostic: patch math, types, Upscaler factory
│   ├── tfjs/                 # existing TF.js adapter (ex-`shared/upscale.ts` etc.)
│   ├── onnx/                 # new ONNX adapter (this spike's code, promoted)
│   ├── browser/              # picks tfjs or onnx at runtime via `backend`
│   ├── node/
│   └── node-gpu/
```

A single shared `Upscaler` class that dispatches to one of two internal
runtimes behind the existing DI seam.

### Why dual-backend works structurally

The factory pattern already in the codebase is the reason this is
feasible: `getUpscaler({ tf, loadModel, getImageAsTensor, ... })` accepts
the runtime as injected dependencies. v2 just promotes "backend" to a
constructor option that picks which set of injected dependencies to use.
No changes to user call sites.

### Costs of dual-backend vs. replace-backend

- **Bundle**: shipping both runtimes in one package is ~2× baseline
  (~4 MB gzipped). Mitigate by:
  1. Dynamic `import()` — only load the runtime the user opted into.
  2. Keeping backend-specific code in separate entry points
     (`upscaler` stays tfjs-only by default; `upscaler/onnx` gates the
     ORT import).
  Most consumers will only pay for one.
- **Maintenance**: ~1.5× current. Two inference paths to keep in sync,
  but the shared patch/tile/image logic (`src/shared/`) stays single-sourced.
  Tests fork per-backend; helpers fork per-backend; everything above
  them (types, Upscaler class, user-facing docs) stays one copy.
- **Release coordination**: v2 can ship the moment the ONNX path is
  stable, without waiting for every `@upscalerjs/*` model to be ported.
  Models migrate on their own schedule because the default backend is
  still TF.js.

### What v2 ships on day one

- `Upscaler({ backend: 'onnx', model })` works
- `Upscaler({ backend: 'tfjs', model })` (default) = current v1 behaviour
- Shared `Tensor` type surfaced for ONNX model authors
- 1–2 headline ONNX models (Real-ESRGAN, MaximIR) published as
  `@upscalerjs/<model>/onnx/<scale>` subpaths
- Migration guide (per-model-package)

### What comes later (v2.x, opportunistic)

- Promote ONNX to default backend once model coverage is there (v3)
- Retire TF.js path if/when usage drops — clean semver-major when that
  happens
- NCHW throughout to remove the per-patch transpose cost

---

## Caveats / known gaps in the spike

- No tests yet (intentional for a spike; the diff is the artifact).
- No Node entry point (tfjs has `/node` and `/node-gpu` — trivially
  addable via `onnxruntime-node` following the same pattern).
- No actual `.onnx` asset committed — the demo HTML expects one at
  `models/real-esrgan-x4.onnx`.
- Fixed-input-shape models (some Real-ESRGAN exports) are noted but
  not fully wired; need a `padTo(modelInputShape)` call in `upscale.ts`
  once we know the session's input shape.
- The `execute` overload set mirrors tfjs but hasn't been exercised
  against the tfjs compatibility tests.
- No build wiring into the monorepo's `wireit` pipeline — deliberately
  isolated so it can be discarded cleanly if we don't proceed.
