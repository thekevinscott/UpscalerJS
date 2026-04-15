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
   This is a **breaking change for every `@upscalerjs/*` model package**
   (esrgan-thick, esrgan-medium, maxim-*, etc.). Migration path:

   - Option A: ship the ONNX backend as `@upscalerjs/onnx` alongside the
     existing package, publish ONNX variants of model packages under new
     names (`@upscalerjs/esrgan-thick-onnx`). Zero backcompat risk.
     **(Recommended for launch.)**
   - Option B: add a compat shim so model packages can expose their
     preprocess/postprocess as backend-agnostic JS (pure arithmetic on
     typed arrays). Requires auditing every existing model package.
   - Option C: big-bang `v2` release that ships both backends under a
     single `upscaler` package selected at import time.

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
   etc. in `/models/*` to size this.

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

- Breaking changes in model packages would alienate current users. The
  migration has to be staged (Option A above).
- `onnxruntime-web` ships fat WASM binaries. Serving + preloading these
  needs documentation for users.
- Any model that relies on TF.js-specific tricks in its `setup()` hook
  needs re-authoring.
- The library gains ownership of a small tensor-ops module. Not glamorous,
  but it's a permanent maintenance line item.

**My recommendation (as captured by this spike):** the direction is correct.
Start by publishing `@upscalerjs/onnx` as an opt-in package alongside the
existing tfjs-backed `upscaler`, port 1–2 headline models (Real-ESRGAN,
MaximIR deblur) and benchmark. If the WebGPU numbers land where expected,
plan a `v2` that makes ONNX the default and moves `upscaler@tfjs` to a
supported-but-frozen status.

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
