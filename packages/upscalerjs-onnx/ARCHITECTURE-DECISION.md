# UpscalerJS ONNX Migration — Architecture Decision

**Status:** Decided 2026-04-21. Agent handoff.

**Context:** PR #1301 (closed) explored ONNX Runtime Web as a TF.js backend replacement via a parallel `packages/upscalerjs-onnx/` spike. Measured benchmarks, port plan, and decision doc committed in the PR.

This doc captures architecture decisions reached in a follow-up conversation with the user, refining the PR's proposals and resolving open questions. The verbatim conversation transcript lives in [`TRANSCRIPT.md`](./TRANSCRIPT.md).

---

## Decisions

### 1. Selection mechanism — `engine` discriminator on the model

`ModelDefinition` gains `engine: 'tfjs' | 'onnx'` (optional, defaults `'tfjs'`).

- Renamed from PR's `modelType` to `engine` — `modelType` was overloaded.
- **No user-facing `backend` flag on `Upscaler`.** Engine is a property of the model, not user intent.
- Dispatch via the existing `getUpscaler({ tf, loadModel, ... })` factory seam in `packages/upscalerjs/src/shared/upscaler.ts`.

### 2. Model export shape — callable factory

Models become callable factories accepting an optional runtime:

```ts
type Factory = (runtime?: OrtLike) => ResolvedModel;
```

`Upscaler` constructor accepts `Factory | ResolvedModel`:

```js
new Upscaler(model);       // Upscaler auto-calls factory → default web runtime
new Upscaler(model());     // user calls, no runtime arg → default web runtime
new Upscaler(model(ort));  // user injects runtime (e.g. onnxruntime-node)
```

All three paths land on the same internal state:

```ts
const resolved = typeof arg === 'function' ? arg() : arg;
```

### 3. Runtime dependency strategy — regular dep on web runtime + DI for native

Each ONNX model package lists its web runtime as a **regular dep**:

```json
{
  "dependencies": {
    "onnxruntime-web": "^1.24"
  }
}
```

- Auto-installed on all modern package managers.
- Zero-config for browser, Workers, Deno/Bun, and zero-config Node (ORT-Web runs WASM in Node).
- Native Node is an explicit opt-in: user installs `onnxruntime-node` and passes via the factory.
- Web runtime remains in `node_modules` unused for native-Node users (~138 MB dead weight, accepted).
- Bundle unaffected (tree-shaken when runtime injected).

**Hard rule:** native runtime packages (`onnxruntime-node`, `@tensorflow/tfjs-node*`) are **never** listed in any UpscalerJS package's `dependencies`, `peerDependencies`, or `optionalDependencies`. User-opt-in only. This is what prevents the Transformers.js failure mode (~720 MB Next.js bundles from shipping both ORT-web and ORT-node as regular deps — see [transformers.js #1164](https://github.com/huggingface/transformers.js/issues/1164), [#1406](https://github.com/huggingface/transformers.js/issues/1406)).

### 4. OSS research basis — Cluster 2 pattern

An 18-library audit of user-choice sub-dependency patterns (Drizzle, TypeORM, Knex, Sequelize, Vercel AI SDK, LangChain.js, LlamaIndex.TS, Kysely, Sequelize, Winston, Pino, Socket.IO, Fastify, Vite, Rollup, PostCSS, unified, Apollo Client, Storybook, Playwright, OpenTelemetry) identified three clusters:

1. Optional peerDeps + lazy `require()` (Drizzle, Knex, TypeORM, Sequelize, Vite)
2. Separate sibling packages + pure DI (AI SDK, LangChain, Kysely, Socket.IO adapters, Rollup/PostCSS plugins, Fastify plugins)
3. String-keyed dynamic `require()` (Pino transports, Express view engines)

UpscalerJS's chosen shape is a Cluster 2 variant: pure DI for native-runtime choice, with a regular web-runtime dep as the zero-config baseline. Retains zero-config while matching modern ecosystem convergence.

### 5. Env split stays

File layout `src/browser/<name>.ts` + `src/node/<name>.ts` continues. Image I/O differs (DOM vs `sharp`); static imports of native modules force env separation. Runtime `typeof window` detection would leak Node-only code into browser builds.

Cosmetic cleanup available: drop `.browser`/`.node` filename suffix since parent directory already encodes env.

### 6. Single root import via conditional exports

```json
{
  "exports": {
    ".": {
      "workerd": "./dist/worker.js",
      "browser": "./dist/browser.js",
      "node": "./dist/node.js",
      "default": "./dist/browser.js"
    }
  }
}
```

`import Upscaler from 'upscaler'` resolves to env-correct build via bundler/runtime condition. No runtime env detection — decided at resolve time.

### 7. Cloudflare Workers — first-party support

v2 ships with `workerd` condition + Miniflare CI matrix. Workers adapter needs WASM image decode (no `sharp`, no DOM). `onnxruntime-web` WASM runs in workerd unchanged.

Deno and Bun resolve via `browser`/`node` conditions accidentally; add explicit conditions when demand shows.

### 8. Legacy entry points

`upscaler/node` and `upscaler/node-gpu` entries kept through v2 (marked `@deprecated` in types). Removed at v3. Existing import paths continue working — v2 is fully additive.

### 9. Zero-config baseline preserved

`upscaler` package behavior unchanged for existing users:
- `new Upscaler()` with no args still works (default-model + TFJS peer dep, as today).
- Existing TFJS model packages unchanged.
- No wrapper package invented.

ONNX is strictly additive — opt-in per model.

### 10. Breaking changes for v2

**None.** Fully additive:
- `engine` discriminator optional on `ModelDefinition`.
- Factory call `model(ort)` optional (Upscaler accepts object too).
- Root `upscaler` import adds conditional exports (doesn't displace old paths).
- `/node`, `/node-gpu` entries remain.
- TFJS peer dep stays on core `upscaler`.

### 11. Deferred to v3 (not scheduled)

- Remove `/node`, `/node-gpu` entries.
- Relocate TFJS peer dep onto TFJS model packages.
- Retrofit existing TFJS model packages to factory-export shape.
- Drop legacy tooling support (old webpack 4, pre-4.7 TS without `exports` support).

### 12. Model hosting

- **NPM**: thin model-def package for discovery (JS-dev audience).
- **GH Releases**: primary weight origin (unlimited rate, stable URLs).
- **HuggingFace**: mirror for ML-community discovery.
- **No postInstall weight-download** — runtime-fetch on first use (already today's pattern via CDN fallback).
- Small models (<5 MB) can inline weights in the NPM tarball for offline-install paths.
- Optional `upscalerjs prefetch` CLI for deterministic builds.

### 13. Rejected: postInstall prompts to install runtime

User explored having the model package's postinstall check for runtime presence and prompt for install. Rejected because:
- CI is non-interactive → prompts hang or default silently.
- `npm install --ignore-scripts` disables postinstall (common in enterprise / security-conscious shops).
- pnpm 10 disables postinstall by default for non-root packages.
- No ecosystem precedent — Playwright, Puppeteer, Sharp, Cypress all download resources non-interactively, never prompt.
- Clear import-time error wrapped by loader is the simpler alternative:

```js
try {
  await import('onnxruntime-web');
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND') {
    throw new Error(
      "@upscalerjs/<model> requires onnxruntime-web. Run:\n  npm install onnxruntime-web"
    );
  }
  throw e;
}
```

### 14. Rejected: wrapper package for zero-config

Considered a `@upscalerjs/start` (or `@upscalerjs/core`, `@upscalerjs/auto`, etc.) wrapper package bundling runtime + default-model. User rejected the naming options and concluded that keeping `upscaler` package's existing zero-config behavior (default-model + TFJS) was cleaner than inventing a new package.

---

## Migration path (high-level)

### Phase 1 — Seam (invisible)

- Add `engine` field to `ModelDefinition` (optional, defaults `'tfjs'`).
- `Upscaler` accepts `Factory | ResolvedModel`.
- Dispatcher on `engine`; `'onnx'` branch throws "not yet available".
- Zero user-visible change.

**Gate:** green CI on existing test matrix. No behavioral diff.

### Phase 2 — ONNX adapter

- Promote spike code from `packages/upscalerjs-onnx/src/shared/` into `packages/upscalerjs/src/onnx/`.
- Wire dispatcher; `'onnx'` branch now real.
- `onnxruntime-web` dynamic-imported on demand inside the factory.
- Synthetic fixture test proves end-to-end.

**Gate:** bundle-size test — TFJS-only bundle has zero ORT bytes.

### Phase 3 — Conditional exports root

- Add `upscaler` root entry with `browser` / `node` / `workerd` conditions.
- `upscaler/node`, `upscaler/node-gpu` kept, marked `@deprecated` in JSDoc.
- Both old + new paths resolve to same build outputs.

**Gate:** CI matrix runs Node, browser (playwright), workerd (Miniflare), all three green on same test suite.

### Phase 4 — Workers adapter

- `src/workerd/` — image I/O using WASM decode (`@jsquash/*` or equivalent) or `ImageData`-only input.
- Miniflare test suite.
- Docs section for Workers usage.

**Gate:** real Workers deploy test.

### Phase 5 — First ONNX model package

- Pick model (TBD — see open questions).
- Publish `@upscalerjs/<name>` with factory export.
- Ships `onnxruntime-web` as regular dep.
- Weights on GH Releases (primary) + HF mirror (secondary).
- Parity test vs TFJS reference if applicable.

**Gate:** end-to-end in all four envs (browser bundler, browser UMD, Node, Workers).

### Phase 6 — Release v2.0

- MIGRATION.md ("nothing changes unless you want it to").
- UMD script-tag examples with **pinned versions**.
- Deprecation notices on `/node`, `/node-gpu` imports.
- v3 roadmap note (consolidation, not yet scheduled).

---

## Open decisions / questions

1. **First ONNX model target** — which model ships v2 end-to-end validation? Needs to convert cleanly via `tf2onnx` (see PR 1301 blockers: `esrgan-thick` + `esrgan-legacy/gans` need Python custom-layer mirrors). Candidates: `esrgan-medium`, `esrgan-slim`, `esrgan-legacy/psnr-small`, `pixel-upsampler`.
2. **Workers image input shape** — WASM decode library (`@jsquash/*` vs alternatives) vs `ImageData`/`ArrayBuffer`-only input from user.
3. **Inline-weights threshold** — under what size do we bundle weights into the NPM tarball vs runtime-fetch? Suggested: 5 MB. `default-model` inlines regardless.
4. **HF mirror automation** — CI job pushing from GH Releases, or skip HF until demand shows? Mirror is useless if it drifts.
5. **`/node-gpu` fate under ONNX** — ORT-Node handles CPU + CUDA + CoreML + DirectML at session create. `/node-gpu` stays as a TFJS-only entry, or collapses into `/node`? Likely stays through v2, removed at v3 alongside other TFJS-specific surface.
6. **v3 timeline** — no commitment. Revisit when v2 adoption data lands.
7. **Deno / Bun explicit conditions** — add in v2 or wait for demand?
8. **TFJS model package retrofit** — retroactively move existing TFJS model packages to factory-export shape, or grandfather them? Grandfathering is simpler but leaves inconsistent surface until v3 forces uniform shape.
9. **Concat-split workaround ownership** — PR 1301 shipped `benchmark/split-concat.py` for the ORT-Web WebGPU wide-Concat bug on Apple Metal / `maxStorageBuffersPerShaderStage=8` adapters. Becomes mandatory step in every converted model's build until ORT-Web fixes upstream. Who files the upstream bug / tracks fix?
10. **UMD global name for ONNX models** — existing TFJS UMD uses `window.Upscaler` + per-model globals. ONNX path needs runtime (`window.ort`) preloaded before `upscaler` UMD script. Confirm UMD docs pin versions (user flagged this explicitly).

---

## Reference

- Verbatim conversation transcript: [`TRANSCRIPT.md`](./TRANSCRIPT.md).
- Original PR #1301 docs (fetched to `/tmp/pr1301-upscaler-onnx/` during conversation):
  - `PORT-DECISION.md` — go/no-go with measured numbers.
  - `PORT-PLAN.md` — 8-phase agent-executable plan (superseded by decisions in this doc).
  - `README.md` — full technical writeup, benchmarks, maintenance picture.
  - `benchmark/` — Node + browser harness, parity scripts, split-concat workaround.
- OSS OR-dep audit findings: summarized in Decision 4 above; full 18-library table in TRANSCRIPT.md.
- Spike source of truth: `packages/upscalerjs-onnx/src/shared/*` in PR #1301 (not merged to main).
- Existing Upscaler factory seam: `packages/upscalerjs/src/shared/upscaler.ts`.
