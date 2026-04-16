# Port UpscalerJS to ONNX — implementation plan (agent handoff)

**Audience:** an autonomous agent executing the port. This document is
a work order, not a decision doc. For the "why", see
[`PORT-DECISION.md`](./PORT-DECISION.md).

**Starting point:** the spike in `packages/upscalerjs-onnx/` already
contains working scaffolding (`src/shared/`, `src/browser/`) that ran
end-to-end on ESRGAN-medium x4 in the benchmark harness. Do NOT rewrite
it; extract and promote it into the main `packages/upscalerjs/` package
alongside the existing TFJS implementation.

**Ground rules (read before starting):**

1. v2.0 ships with `backend: 'tfjs'` as the default. Existing users
   must see zero behavioural change on upgrade. Do not break public API.
2. All public types exported from `@upscalerjs/core` remain identical
   by name and shape where possible. Backend-specific types live behind
   a narrow seam.
3. No new npm packages. One package (`@upscalerjs/core` or keep
   `upscaler`) with two backends selected at construction time.
4. Write tests alongside code. Do not ship a phase without its tests
   green in CI.
5. Ask before introducing a third dependency, changing a published
   package's exports map, or deleting a model package.

---

## Phase 0 — Repo prep (0.5 day)

Goal: working branch, green baseline, agreed naming.

### Tasks

- [ ] Create branch `feat/onnx-dual-backend` from `main`.
- [ ] Run `npm install && npm run lint && npm run test` at repo root;
      record baseline pass/fail counts in the PR body.
- [ ] Decide package layout. **Default recommendation**: keep the main
      package as `upscaler` and introduce a single new subpath export
      `upscaler/onnx`, with both backends served from the same package.
      Rationale: we already ship `upscaler` / `upscaler/node` /
      `upscaler/node-gpu`; `upscaler/onnx` (browser) and
      `upscaler/onnx/node` slot in cleanly.
      - If the agent finds this infeasible due to bundler/types
        constraints, fall back to a sibling package
        `@upscalerjs/onnx` and stop to check in before proceeding.
- [ ] Delete `packages/upscalerjs-onnx/` ONLY after Phase 2 has
      successfully promoted its code. Until then it's the reference.

### Acceptance

- Baseline `npm test` numbers recorded in branch commit.
- Branch pushes cleanly; CI green on an empty change.

---

## Phase 1 — Backend seam in the existing package (1–2 days)

Goal: introduce a `backend` option on `Upscaler` that is wired but still
only accepts `'tfjs'`. No behaviour change.

### Files to modify

- `packages/upscalerjs/src/shared/types.ts`
  - Add `export type Backend = 'tfjs' | 'onnx';`
  - Add `backend?: Backend` to `UpscalerOptions`.
- `packages/upscalerjs/src/shared/upscaler.ts`
  - At top of the constructor, read `opts.backend ?? 'tfjs'`. If not
    `'tfjs'`, throw `"backend ${b} is not yet supported; see MIGRATION.md"`.
  - Do NOT touch any other behaviour.
- `packages/upscalerjs/src/shared/upscaler.test.ts`
  - Add tests: default backend is `'tfjs'`; explicit `'tfjs'` works;
    `'onnx'` throws the documented error today; unknown string throws.
- `packages/upscalerjs/README.md`
  - Document the new option under "Options". Mark `'onnx'` as
    "coming in v2.0.0-beta".

### Acceptance

- All existing tests still pass unchanged.
- Three new unit tests in `upscaler.test.ts`.
- `grep -R "backend.*onnx" packages/upscalerjs/src` returns only the
  new throw-site and its test.

### Don't

- Do not introduce a factory, a registry, or an abstract-class
  hierarchy yet. A single `if (backend !== 'tfjs') throw` is the whole
  change.

---

## Phase 2 — Promote the ONNX runtime into `packages/upscalerjs` (3–5 days)

Goal: move the spike's working ONNX pipeline into the main package
behind the `backend: 'onnx'` option. Parity with the spike on
ESRGAN-medium x4 is the bar.

### 2.1 Copy scaffolding

From `packages/upscalerjs-onnx/src/shared/` to
`packages/upscalerjs/src/onnx/`:

| Source | Destination | Notes |
|---|---|---|
| `tensor.ts` | `src/onnx/tensor.ts` | unchanged |
| `tensor-utils.ts` | `src/onnx/tensor-utils.ts` | unchanged |
| `image-utils.ts` | `src/onnx/image-utils.ts` | unchanged |
| `model-utils.ts` | `src/onnx/model-utils.ts` | drop tfjs-specific branches |
| `upscale.ts` | `src/onnx/upscale.ts` | unchanged logic |
| `warmup.ts` | `src/onnx/warmup.ts` | unchanged |
| `types.ts` | `src/onnx/types.ts` | **merge** with `shared/types.ts`, see 2.2 |
| `upscaler.ts` (`getUpscaler`) | inline into dispatcher, see 2.3 | |

### 2.2 Type unification

Goal: one `ModelDefinition` that both backends consume, plus a
backend-specific `preprocess`/`postprocess` pair.

In `packages/upscalerjs/src/shared/types.ts`:

```ts
export interface ModelDefinitionBase {
  scale?: number;
  channels?: 3;
  inputRange?: [number, number];
  outputRange?: [number, number];
  divisibilityFactor?: number;
  meta?: Record<string, unknown>;
  _internals?: ModelDefinitionInternals;
}

export interface TfjsModelDefinition extends ModelDefinitionBase {
  modelType?: 'layers' | 'graph';
  path?: string;
  // existing tfjs pre/post signatures
  preprocess?: (t: tf.Tensor4D) => tf.Tensor4D;
  postprocess?: (t: tf.Tensor4D) => tf.Tensor4D;
  setup?: Setup;
  teardown?: Teardown;
}

export interface OnnxModelDefinition extends ModelDefinitionBase {
  modelType: 'onnx';
  path?: string;
  layout?: 'nhwc' | 'nchw';
  inputName?: string;
  outputName?: string;
  preprocess?: (t: OnnxTensor) => OnnxTensor;
  postprocess?: (t: OnnxTensor) => OnnxTensor;
}

export type ModelDefinition = TfjsModelDefinition | OnnxModelDefinition;
```

Discriminator: `modelType === 'onnx'`. Any codepath that narrows
`ModelDefinition` does so via that field.

### 2.3 Dispatcher

Replace the throw in `packages/upscalerjs/src/shared/upscaler.ts` with
a lazy dispatch:

```ts
if ((opts.backend ?? 'tfjs') === 'onnx') {
  const { createOnnxUpscaler } = await import('../onnx');
  return createOnnxUpscaler(opts, internals);
}
// existing tfjs path
```

- Dynamic import is required so that users who stay on TFJS never ship
  `onnxruntime-web`. Verify this with a bundle-size assertion in
  Phase 5.

### 2.4 Browser + Node entrypoints

- `packages/upscalerjs/src/browser/index.ts`
  - No change to the default export.
  - Export `onnxLoadModel` from `./loadModel.onnx.browser.ts` (new file
    copied from `packages/upscalerjs-onnx/src/browser/loadModel.browser.ts`).
  - Dispatcher in shared uses this when `backend === 'onnx'`.
- `packages/upscalerjs/src/node/index.ts`
  - New file `./loadModel.onnx.node.ts` that uses `onnxruntime-node`.
  - Gate with `require('onnxruntime-node')` behind dynamic import so
    Node users on TFJS don't need the dep installed.
- `package.json`:
  - Move `onnxruntime-web` and `onnxruntime-node` to `peerDependencies`
    with `peerDependenciesMeta.optional = true`. Document in README.

### 2.5 Model loading

The spike's `loadModel.browser.ts` already handles CDN fallback and
session creation. Port as-is. Add:

- **Execution provider selection**: when running in browser, try
  `['webgpu', 'wasm']`. If WebGPU init throws, fall back to WASM
  silently and warn once.
- **Node**: default EP is `['cpu']`. Document that users can opt into
  `['cuda']`, `['coreml']`, etc. via a new `UpscalerOptions.onnx` field:
  `{ executionProviders?: string[] }`. Defer richer config to v2.1.

### 2.6 Tests

Port `packages/upscalerjs/src/shared/upscale.test.ts` to have a twin
`packages/upscalerjs/src/onnx/upscale.test.ts`:

- Mock `ort.InferenceSession` with a stub that:
  - Reports `inputNames: ['input']`, `outputNames: ['output']`.
  - On `run()` returns a tensor whose data is the input's shape scaled
    by `scale` factor filled with a deterministic pattern.
- Assert: patch loop visits the right tiles; slice/concat round-trips;
  parity with a manually-computed reference at small sizes.

Port `upscaler.test.ts` similarly: mock `loadModel`, assert the
dispatch picks ONNX path when `backend: 'onnx'`.

### Acceptance

- `npm test -w upscaler` green; new ONNX tests cover `upscale.ts`,
  `warmup.ts`, `model-utils.ts`, and the dispatcher.
- `new Upscaler({ backend: 'onnx', model: esrganMediumOnnx })` in a
  Node script produces a byte-identical-within-5e-3 upscaled image vs.
  the benchmark harness's ORT output on the same inputs.
- `packages/upscalerjs-onnx/` is deleted in this PR's final commit.
  (The benchmark/ directory moves to `packages/upscalerjs/benchmark/`
  — it's still useful; keep `benchmark/split-concat.py` in particular.)

---

## Phase 3 — Model conversion pipeline (2–3 days)

Goal: a reproducible, committed command that turns each tfjs model in
`models/*` into an ONNX artifact consumable by the new backend.

### 3.1 Conversion script

Create `tools/tf2onnx/convert.py`:

- Inputs: `--tfjs-model <path-to-model.json> --out <output.onnx> [--opset 17]`.
- Steps:
  1. `tensorflowjs_converter --input_format=tfjs_layers_model
     --output_format=keras <in> <tmp>.h5`
  2. Load `.h5` with `tf.keras.models.load_model`, re-registering any
     custom layers (see 3.2).
  3. Export to SavedModel, then `tf2onnx.convert --saved-model <dir>
     --output <out> --opset 17`.
  4. Run `benchmark/split-concat.py <out> <out>.tmp && mv <out>.tmp <out>`
     on the result — mandatory for WebGPU correctness on Apple Metal.
  5. Parity-check with `onnxruntime` vs. the original `tfjs_layers_model`
     loaded through `tfjs_graph_converter` — fail if max-abs > 1e-4.

### 3.2 Custom-layer registry

Create `tools/tf2onnx/custom_layers.py` with Python re-implementations
matching the TypeScript `setup(tf)` registrations in
`packages/shared/src/esrgan/esrgan.ts`:

- `MultiplyBeta` (scalar multiply, `beta = 0.2`) — trivial Lambda.
- `PixelShuffle4x` — `tf.nn.depth_to_space(block_size=4)`; equivalent
  ONNX op is `DepthToSpace` with `blocksize=4, mode="CRD"`.
- Wire these into the custom object dict passed to `load_model`.

### 3.3 Per-model Makefile

Create `models/<name>/Makefile` with a single target:

```makefile
models/x4/model.onnx: models/x4/model.json
	python ../../tools/tf2onnx/convert.py \
	  --tfjs-model $< --out $@
```

Do this for each model package. List the expected-to-convert-cleanly
set first; for the custom-layer set, land the Python classes in 3.2
before adding the target.

### 3.4 Model status matrix

Track per-model state in `packages/upscalerjs/MODEL-STATUS.md`:

| model | tfjs | onnx | custom layers | status |
|---|---|---|---|---|
| esrgan-medium/x4 | shipped | ready | none | ✅ converted, parity ok |
| esrgan-slim/* | shipped | ready | none | ⏳ verify |
| esrgan-legacy/psnr-small | shipped | ready | none | ⏳ verify |
| esrgan-thick/* | shipped | needs work | MultiplyBeta, PixelShuffle4x | 🔧 |
| esrgan-legacy/gans | shipped | needs work | (TBD) | 🔧 |
| maxim-* | shipped | ? | ? | ❓ spike conversion first |
| pixel-upsampler | shipped | ready | none | ⏳ verify |
| default-model | shipped | needs republish | none | 🔧 |

Agent: verify each row by running the conversion; replace ⏳/❓ with ✅ or 🔧.

### Acceptance

- `make -C models/esrgan-medium models/x4/model.onnx` produces a
  committed `.onnx` that loads under the new backend and passes parity.
- At minimum these models ship with committed ONNX artifacts in
  this PR: `esrgan-medium` (all scales), `esrgan-slim` (all scales),
  `pixel-upsampler`. Others may land in subsequent PRs.
- `MODEL-STATUS.md` lists every model in `models/` with current state.

---

## Phase 4 — Day-one ONNX model packages (1–2 days)

Goal: ship one or two headline ONNX-backed model packages so
`backend: 'onnx'` is actually useful on release.

### Required

- `models/esrgan-medium`: add `src/x4/index.onnx.ts` exporting an
  `OnnxModelDefinition`:
  ```ts
  export default {
    modelType: 'onnx',
    _internals: { name, version, path: 'models/x4/model.onnx' },
    scale: 4,
    layout: 'nhwc',
    inputRange: [0, 255],
    outputRange: [0, 255],
    meta: { ...same as tfjs meta, backend: 'onnx' },
  } satisfies OnnxModelDefinition;
  ```
  Add it to `src/index.ts` as a named export `x4Onnx`.
  Repeat for x2, x3, x8.
- `models/default-model`: republish the ESRGAN-medium x4 ONNX artifact
  under this package's `models/` folder so `new Upscaler({ backend: 'onnx' })`
  with no explicit `model` works — same contract as the tfjs default.

### Optional (budget permitting)

- `models/pixel-upsampler` — smallest model, good smoke test.
- `models/esrgan-slim/x4` — parity with the most common "fast" choice.

### Acceptance

- In a Node integration test:
  ```ts
  import Upscaler from 'upscaler';
  import model from '@upscalerjs/esrgan-medium/x4/onnx';
  const u = new Upscaler({ backend: 'onnx', model });
  await u.upscale(fixtureImg);
  ```
  produces output whose max-abs diff vs. the tfjs equivalent is < 5e-3.
- Same test in a browser harness (reuse the existing puppeteer driver
  at `benchmark/browser/`).

---

## Phase 5 — Bundle hygiene + telemetry (1 day)

Goal: prove that users on `backend: 'tfjs'` pay zero cost for the new
path.

### Tasks

- [ ] Add a `tests/bundle-size/` check that imports `Upscaler` with no
      options, builds with rollup in production mode, and asserts
      `onnxruntime-web` does not appear in the final bundle.
- [ ] Same check for `backend: 'onnx'`: asserts `@tensorflow/tfjs`
      does not appear.
- [ ] Document peer-dep install in the README's "Installation" section:
      ```
      # tfjs user (default)
      npm install upscaler @tensorflow/tfjs
      # onnx user
      npm install upscaler onnxruntime-web
      ```
- [ ] Update `CHANGELOG.md` with v2.0.0-beta.0 notes.

### Acceptance

- Bundle-size tests green.
- README "Installation" updated.
- `@upscalerjs/core` (or `upscaler`) package.json has both runtimes
  as optional peer deps.

---

## Phase 6 — Migration docs (0.5 day)

### Files to create

- `packages/upscalerjs/MIGRATION.md` covering:
  - How to opt into ONNX (`new Upscaler({ backend: 'onnx', model })`).
  - Differences a user can observe:
    - `upscaler.getModel()` returns an `InferenceSession` under ONNX.
    - `dispose()` calls `session.release()`.
    - Error class names from the loader differ.
  - Differences model-definition **authors** must know:
    - `preprocess`/`postprocess` take the local `Tensor`, not `tf.Tensor4D`.
    - `setup`/`teardown` hooks are not run under ONNX — register any
      custom layers in `tools/tf2onnx/custom_layers.py` instead.
    - `modelType: 'onnx'` is the new discriminator.
  - Performance expectations: point at the benchmark harness and its
    committed results.
  - Known limitations: Concat-8 workaround, WebGL EP limited by
    static-shape requirement, WebNN EP is flagged.

### Acceptance

- Doc links resolve. At least one round of human review before merge.

---

## Phase 7 — Release (0.5 day)

- [ ] `npm version 2.0.0-beta.0 -w upscaler`.
- [ ] `npm publish --tag beta` (gated on CI green).
- [ ] Announce in GitHub Discussions / release notes pointing at
      `PORT-DECISION.md` for the rationale.

Do NOT tag `@latest` until enough beta bake time has passed. v3.0 is
the release that flips the default to `'onnx'`; that is out of scope
for this plan.

---

## Carry-over backlog (do NOT do in this PR)

File these as issues instead:

1. Port remaining models to ONNX (`esrgan-thick`, `esrgan-legacy/gans`,
   `maxim-*`). Needs per-model custom-layer work.
2. Upstream the Concat-split fix into ORT-Web (or at least file an
   issue). Our workaround lives in `benchmark/split-concat.py`.
3. Flip default `backend` to `'onnx'` at v3.0; retire the TFJS path at
   v4.0.
4. WebGL EP support for models with dynamic shapes (blocked on ORT-Web).
5. Add `@upscalerjs/esrgan-medium/x4/onnx` to the CDN pipeline (same
   jsDelivr/unpkg story as tfjs).

---

## Reference material the agent should keep open

- **Spike source of truth**: `packages/upscalerjs-onnx/src/shared/*`
  — the port is a promotion of this code, not a rewrite.
- **Decision rationale + measured numbers**: `PORT-DECISION.md`.
- **Benchmark harness**: `packages/upscalerjs-onnx/benchmark/`
  (moves to `packages/upscalerjs/benchmark/` in Phase 2).
- **Concat surgery**: `benchmark/split-concat.py` — mandatory on every
  converted model until ORT-Web fixes the upstream bug.
- **Existing TFJS Upscaler**:
  `packages/upscalerjs/src/shared/upscaler.ts` — the behaviour the
  ONNX path must match method-for-method.
- **Existing shared model defs**:
  `packages/shared/src/esrgan/esrgan.ts` — the custom-layer setup code
  that needs Python mirrors in `tools/tf2onnx/custom_layers.py`.

---

## Progress tracking

Update this table as phases land. PR description should link here.

| Phase | Status | PR |
|---|---|---|
| 0 — Repo prep | ⏳ | |
| 1 — Backend seam | ⏳ | |
| 2 — Promote ONNX runtime | ⏳ | |
| 3 — Conversion pipeline | ⏳ | |
| 4 — Day-one models | ⏳ | |
| 5 — Bundle hygiene | ⏳ | |
| 6 — Migration docs | ⏳ | |
| 7 — Release | ⏳ | |

---

## When to stop and ask

- The type unification in Phase 2.2 forces a breaking change to
  `ModelDefinition` that can't be done additively.
- Any model's tf2onnx export fails with a custom-layer error not
  covered by `tools/tf2onnx/custom_layers.py`.
- `onnxruntime-web` ships a major version while the port is in flight
  (we're pinning `^1.24` — check release notes before bumping).
- Bundle-size check in Phase 5 shows either runtime leaking into the
  other's bundle — means dynamic-import gating is wrong; pause, fix.
- An existing published user API would have to change in a way not
  documented in this plan.
