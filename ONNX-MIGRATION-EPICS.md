# UpscalerJS ONNX Migration — Epic Breakdown

**Companion to:** [`ONNX-MIGRATION.md`](./ONNX-MIGRATION.md) (on `docs/onnx-migration-architecture`).
**Goal:** decompose the migration into independently shippable epics that minimize breakage and deliver value where possible, mapped to strict semver.

---

## Semver framing

The source spec (A8) states "Breaking changes for v2: None. Fully additive." Under strict semver this means the whole plan lives on `1.x` as minor releases; only genuine removals earn a `2.0`.

Semver is a contract on the public API surface, not on user-visible behavior. For TypeScript libraries, types count as API:

| Change | Semver |
|---|---|
| Internal refactor, no exported-type change | patch |
| New optional field on a consumer-facing interface | minor |
| New accepted argument shape on a public constructor | minor |
| New exported function / env var / export condition | minor |
| `@deprecated` JSDoc on existing exports (docs only) | patch |
| Import-time warning on existing exports (observable) | minor |
| Demoting a peer dep from required to optional | debatable (treat as minor) |
| Removal, rename, or required-field addition | major |

Marketing-major (cutting `2.0` for additive work to signal direction) costs every downstream `^1.x.x` caret range its auto-update path. Recommendation: stay on `1.x` for all additive work; brand the ONNX era via docs/release-notes if the narrative matters.

---

## Epic 1 — TF.js runtime relocation + factory retrofit *(minor, multi-release)*

**Rationale for going first:** A3's end state is "each model package ships its default runtime as a regular `dependencies` entry." A9 mis-defers this to v3. Doing it first makes the ecosystem consistent *before* the first ONNX model arrives, so ONNX packages aren't a special case, and it shrinks Epic 7 to just legacy-subpath removal. It's also the hairiest refactor in the plan — ~12 existing model packages — so front-loading it means every later epic plugs into a stable surface.

**No user impact** is achieved by staging the work so every intermediate state is backward-compatible.

### Starting-point notes (confirmed against current code)

- The `Upscaler` constructor already accepts object-or-function via `UpscalerOptions.model: ModelDefinitionObjectOrFn` (`packages/shared/src/types.ts:99-101`); `getModel` normalizes at `upscaler.ts:90`. **No constructor polymorphism work is needed** — that stage was an over-engineered answer to a solved problem.
- Existing shipped models (`models/*/src/<scale>/index.ts`) export the eagerly-resolved object: `export default getModelDefinition(2, '...')`.
- Current `ModelDefinition` lifecycle hooks (`setup`, `teardown`, `preprocess`, `postprocess`) take `tf` as a per-call parameter. The factory form moves runtime injection from four per-call seams to one per-instance seam (factory captures it in closure).

### Stages

**Stage 1 — Factory form as the canonical model shape.** Single coherent change.
1. Strip `tf` parameter from `Setup`, `Teardown`, `PreProcess`, `PostProcess` type signatures in `packages/shared/src/types.ts`. Factories close over runtime.
2. Add `engine?: 'tfjs' | 'onnx'` to `ModelDefinition` (optional, defaults `'tfjs'`). Note the unfortunate name collision with existing `modelType: 'graph' | 'layer'` — orthogonal concepts, both stay.
3. Update `getESRGANModelDefinition` / `getMaximModelDefinition` to accept runtime as an argument and produce closures that capture it.
4. Rewrite each shipped `@upscalerjs/*` model's entry file from `export default getModelDefinition(...)` to `export default (tf) => getModelDefinition(tf, ...)`. ~1 line per entry, ~12 packages × several scales each.
5. Teach dispatcher in `getModel` / `loadModel` to select runtime based on `engine` and pass it to the factory. `'onnx'` branch throws "not yet available."
6. Constructor continues accepting `ModelDefinitionObjectOrFn` so user-authored inline object configs still work — factory is canonical for shipped models, object form is the compat path for users.

**Stage 2 — TF.js as a regular dep in every `@upscalerjs/*` model package.** Bulk `package.json` edit. Users who already have `@tensorflow/tfjs` get deduped by the PM. Users who were relying on core's peer-dep warning now auto-get it — strictly more forgiving than today.

**Stage 3 — Demote TF.js peer dep on core to optional + `@deprecated`.** Don't remove yet — that's Epic 7. Optional means no warning for users who lack it (because model packages now supply it); deprecated signals to anyone reading the manifest.

### Load-bearing details

- `@upscalerjs/default-model` must be first through Stages 1 and 2. A7 requires `new Upscaler()` with no args to keep working; the zero-arg path pulls TF.js transitively through default-model before core's peer dep softens in Stage 3.
- Stage 1 step 4 is per-package risk. Stages 1 steps 1–3 land atomically (shared-types + factory-producer changes); step 4 can migrate models one-at-a-time if the retrofit proves bumpy, keeping any regression scoped to its own package.
- Stage 3 is the one subtle semver call. Demoting a peer dep from required to optional is *arguably* not breaking (fewer constraints = more permissive), but some installers log differently. Optional + deprecated preserves the declaration for introspection.

### No-user-impact guarantees

- Constructor accepts both forms (factory + object) throughout — existing `new Upscaler({ model: customObject })` inline configs keep working.
- Shipped model imports (`import x2 from '@upscalerjs/esrgan-medium/x2'`) change shape from object to function, but any code feeding them into `new Upscaler({ model: x2 })` works unchanged because the constructor normalizes.
- Code that reached into a shipped model's fields directly (`x2.scale`, `{...x2}`) breaks. Internal API; no documented user contract; acceptable.

### Gate
Existing test matrix green after each stage. No behavioral diff for users using documented APIs.

---

## Epic 2 — Cloudflare Workers for existing TF.js models *(minor)*

**Scope:** Phase 3 + Phase 4 of the spec, scoped to TF.js only. Root `exports` with 4 conditions (`workerd`, `browser`, `node`, `default`), keeping `/node` and `/node-gpu` subpaths unchanged. `src/workerd/` adapter with WASM image decode. Miniflare CI matrix.

**Why it exists:**
- The only piece of Part 1 that delivers user value without touching ONNX. Edge-runtime deployers get served on a 1.x minor.
- Conditional-exports rewrite (A5) is the riskiest single change in the plan for existing users — it touches import resolution everywhere. Landing it with TF.js as the only engine means any bundler/resolver fallout surfaces against a known-good runtime, not tangled with ONNX novelty.

**Gate:** real Workers deploy test + Node + browser (Playwright) all green on the same suite.

**Independence:** can ship in parallel with Epic 1 after its Stage 1.

---

## Epic 3 — Hosting infrastructure (no ONNX model yet) *(minor)*

**Scope:** Part 2 infra, validated against a synthetic or small existing model.
- Manifest format (H7), content-addressed filenames (H8).
- Node `postinstall` script + `UPSCALERJS_SKIP_DOWNLOAD`, `UPSCALERJS_CACHE`, `UPSCALERJS_CDN` env vars + `npx @upscalerjs/<model> install` CLI fallback (H5).
- Browser fetch → IndexedDB streaming cache (H6) with public `Upscaler.precache()` and `onModelDownloadProgress` APIs.
- Template repo, reusable GH Actions, dual-CDN publish workflow (H10, H11).

**Why it exists:**
- Whole parallel workstream from Part 1. Owns CDNs, manifests, postInstall, IndexedDB, CI release flow, per-PM support (H12). Not derivable from architecture work.
- Hosting is structurally required before any ONNX model ships: 1 GB weights cannot live in NPM (H2).
- Shipping standalone lets `Upscaler.precache()` and progress reporting benefit existing TF.js users before any ONNX work.
- Highest unknown-count in the plan (open H3–H10 cover chunking, eviction, PM behavior, service worker recipes). Validating against a non-ONNX model means the first real ONNX ship isn't also the first real hosting ship.

**Blocker before starting:** GH org + HF org naming (open hosting #1, #2). URLs embed into manifests; every published weight file depends on them.

**Gate:** install + load test across npm, pnpm, yarn classic (H12).

---

## Epic 4 — ONNX adapter live, dispatcher wired *(minor)*

**Scope:** Phase 2 of the spec. Promote spike code from `packages/upscalerjs-onnx/src/shared/` into `packages/upscalerjs/src/onnx/`. Dynamic-import `onnxruntime-web` on demand. Implement A10's import-time error UX when the runtime is missing.

**Why it exists:**
- Epic 1 Stage 1 step 5 left the `'onnx'` branch as a throwing stub. This epic fills it in.
- The bundle-size gate ("TF.js-only bundle has zero ORT bytes") is a property of the adapter wiring, not of any specific model. Proving it in isolation means Epic 5 doesn't simultaneously debug model conversion and tree-shaking.
- Plugs into the already-consistent factory-export ecosystem from Epic 1. ONNX model packages won't look structurally different from TF.js ones.

**Gate:** bundle-size CI check — TF.js-only bundle contains zero ORT bytes.

---

## Epic 5 — First ONNX model package *(minor)*

**Scope:** Phase 5. Ship one ONNX model end-to-end. Candidates (all convert cleanly per spec header): `esrgan-medium`, `esrgan-slim`, `esrgan-legacy/psnr-small`, `pixel-upsampler`. Exercises Epics 1–4 in all four envs.

**Why it exists:**
- The actual payoff. PR #1301 measured ~2.3× Node/CPU speedup and 1.7e-6 numerical parity vs TF.js. Epics 1–4 are infrastructure; this is the product.
- One model, not a fleet: shipping one validates the full pipeline (NPM-inline threshold H4, manifest sha verification H7, external-data sharding H9, four env targets) against real weights without multiplying the debugging surface.

**Blocker:** concat-split Metal workaround (open arch #7) is mandatory for every ONNX conversion. Upstream issue must be filed and tracked before this ships, or every future model inherits hidden tribal knowledge.

**Gate:** end-to-end in browser bundler, browser UMD, Node, Workers.

---

## Epic 6 — Deprecation notices + MIGRATION.md *(patch or minor)*

**Scope:** Phase 6 minus the version bump. `@deprecated` JSDoc on `/node` and `/node-gpu`. UMD-with-pinned-versions docs. "Nothing changes unless you want it to" migration guide.

**Why it exists:**
- Users need to see the direction toward Epic 7 before it lands or they'll be surprised.
- JSDoc on existing exports makes tsc and IDEs warn during the 1.x lifespan, giving users a grace window measured in minors rather than across a major boundary.
- MIGRATION.md content isn't meaningful until the capabilities it describes exist. This epic trails the earlier work by design.
- Covers open arch #6 (UMD global for ONNX — `window.ort` preloaded, pinned versions).

**Semver:** patch if docs + JSDoc only. Minor if it also adds runtime deprecation warnings (observable behavior change).

---

## Epic 7 — Legacy cleanup *(major — 2.0)*

**Scope:** what's left after Epic 1 already did the factory retrofit and peer-dep demotion:
- Remove `/node` and `/node-gpu` subpaths.
- Remove the now-optional-and-deprecated TF.js peer dep from core's manifest entirely.
- Drop legacy tooling (pre-`exports` TypeScript, old webpack).

**Why it exists (and might not need to):**
- The only genuinely breaking work left. No additive way to remove an entry point.
- Scheduled last because open arch #8 says timing needs 1.x adoption data. Each 1.x minor's NPM download stats tell you who still imports `/node` vs the root entry — you can price the disruption before cutting the major.
- **Worth questioning whether this epic is necessary at all.** The `/node` and `/node-gpu` subpaths are deprecated, dormant aliases — leaving them in place through 1.x costs a few bytes of published metadata and nothing else. If there's no forcing function for a 2.0, indefinitely staying on 1.x is a legitimate option.

---

## Sequencing

Epic 1 is the critical spine — nothing ONNX-facing can merge until Stage 1 step 5 (dispatcher) lands, and the per-package model retrofit (Stage 1 step 4) can span several minors if rolled out one-at-a-time.

Parallelizable alongside Epic 1:
- **Epic 2** (Workers) depends on nothing in Epic 1. Can start immediately in parallel.
- **Epic 3** (hosting) depends on nothing from Epic 1. Can start immediately in parallel.

Serial after Epic 1 completes:
- **Epic 4** (ONNX adapter) → **Epic 5** (first ONNX model).

**Epic 6** piggybacks on any later minor.
**Epic 7** waits on adoption telemetry from 1.x minors, and may never cut.

### Main tradeoff

Epic 3 is the largest and least-scoped (IndexedDB UX, CDN operational learning, PM behavior audit). Two orderings:

- **(a) Epic 3 before Epic 5.** First ONNX model benefits from a mature cache. Safer. One production surface to debug at a time.
- **(b) Epic 5 with a minimal cache, harden Epic 3 after.** ONNX speedup reaches users sooner. More concurrent risk.

Recommendation: **(a)**, given solo-maintainer + agent-workforce constraints (H1).

---

## Proposed release mapping

| Release | Work | Semver | Notes |
|---|---|---|---|
| 1.(n+1).0 | Epic 1 Stage 1 | minor | Factory-canonical: types stripped of `tf`, `engine` field, dispatcher, shipped models retrofitted. |
| 1.(n+2).0 | Epic 1 Stages 2–3 | minor | TF.js as dep on all model packages + peer dep demoted to optional/deprecated. |
| 1.(n+3).0 | Epic 2 | minor | Workers ships for existing TF.js users. Can shift earlier. |
| 1.(n+4).0 | Epic 3 | minor | `precache()`, progress API, hosting infra proven against existing models. |
| 1.(n+5).0 | Epic 4 | minor | ONNX adapter wired. |
| 1.(n+6).0 | Epic 5 | minor | First ONNX model package. The payoff. |
| 1.(n+7).x | Epic 6 | patch or minor | Deprecation + MIGRATION.md. |
| 2.0.0 (optional) | Epic 7 | major | Legacy cleanup. Post-adoption-data. May never cut. |

Epics 2 and 3 can shift earlier (run alongside Epic 1) at the cost of parallel maintenance attention.
