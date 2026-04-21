# UpscalerJS ONNX Migration — Epic Breakdown

**Companion to:** [`ONNX-MIGRATION.md`](./ONNX-MIGRATION.md) (on `docs/onnx-migration-architecture`).
**Goal:** decompose the migration into independently shippable epics that minimize breakage and deliver value where possible, mapped to strict semver.

---

## Semver framing

The source spec (A8) states "Breaking changes for v2: None. Fully additive." Under strict semver this means the whole plan lives on `1.x` as minor releases; only A9's removals earn a `2.0`.

Semver is a contract on the public API surface, not on user-visible behavior. For TypeScript libraries, types count as API:

| Change | Semver |
|---|---|
| Internal refactor, no exported-type change | patch |
| New optional field on a consumer-facing interface | minor |
| New accepted argument shape on a public constructor | minor |
| New exported function / env var / export condition | minor |
| `@deprecated` JSDoc on existing exports (docs only) | patch |
| Import-time warning on existing exports (observable) | minor |
| Removal, rename, or required-field addition | major |

Marketing-major (cutting `2.0` for additive work to signal direction) costs every downstream `^1.x.x` caret range its auto-update path. Recommendation: stay on `1.x` for all additive work; brand the ONNX era via docs/release-notes if the narrative matters.

---

## Epic 1 — Engine seam *(minor)*

**Scope:** Phase 1 of the spec. Add optional `engine: 'tfjs' | 'onnx'` to `ModelDefinition`. Teach `Upscaler` constructor to accept `Factory | ResolvedModel`. Dispatcher branches on `engine`; `'onnx'` throws "not yet available."

**Why it exists:**
- Narrowest possible intervention point — dispatch goes through the existing factory seam at `packages/upscalerjs/src/shared/upscaler.ts`.
- Precondition for every other ONNX epic. Landing it invisibly proves the existing test matrix still passes before any real ONNX code merges.
- Not a patch: `ModelDefinition` is a public type; adding `engine` expands the API surface. Users can write TS against it day one.

**Gate:** green CI on existing test matrix, zero behavioral diff for existing users.

**Risk:** near zero. Pure refactor of one factory function.

---

## Epic 2 — Cloudflare Workers for existing TF.js models *(minor)*

**Scope:** Phase 3 + Phase 4 of the spec, scoped to TF.js only. Root `exports` with 4 conditions (`workerd`, `browser`, `node`, `default`), keeping `/node` and `/node-gpu` subpaths unchanged. `src/workerd/` adapter with WASM image decode. Miniflare CI matrix.

**Why it exists:**
- The only piece of Part 1 that delivers user value without touching ONNX. Edge-runtime deployers get served on a 1.x minor.
- Conditional-exports rewrite (A5) is the riskiest single change in the whole plan for existing users — it touches import resolution everywhere. Landing it with TF.js as the only engine means any bundler/resolver fallout surfaces against a known-good runtime, not tangled with ONNX novelty.

**Gate:** real Workers deploy test + Node + browser (Playwright) all green on the same suite.

**Independence:** can ship before Epics 3–5.

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
- Without it, the `'onnx'` branch from Epic 1 is still a stub.
- The bundle-size gate ("TF.js-only bundle has zero ORT bytes") is a property of the adapter wiring, not of any specific model. Proving it in isolation means Epic 5 doesn't simultaneously debug model conversion and tree-shaking.
- The dynamic-import boundary is where the "missing runtime" error UX lives — observable contract, deserves isolated testing.

**Gate:** bundle-size CI check — TF.js-only bundle contains zero ORT bytes.

---

## Epic 5 — First ONNX model package *(minor)*

**Scope:** Phase 5. Ship one ONNX model end-to-end. Candidates (all convert cleanly per spec header): `esrgan-medium`, `esrgan-slim`, `esrgan-legacy/psnr-small`, `pixel-upsampler`. Exercises Epics 1–4 in all four envs.

**Why it exists:**
- The actual payoff. PR #1301 measured ~2.3× Node/CPU speedup and 1.7e-6 numerical parity vs TF.js. Epics 1–4 are infrastructure; this is the product.
- One model, not a fleet: A9 defers retrofitting existing TF.js packages to v3. Shipping one validates the full pipeline (NPM-inline threshold H4, manifest sha verification H7, external-data sharding H9, four env targets) against real weights without multiplying the debugging surface.

**Blocker:** concat-split Metal workaround (open arch #7) is mandatory for every ONNX conversion. Upstream issue must be filed and tracked before this ships, or every future model inherits hidden tribal knowledge.

**Gate:** end-to-end in browser bundler, browser UMD, Node, Workers.

---

## Epic 6 — Deprecation notices + MIGRATION.md *(patch or minor)*

**Scope:** Phase 6 minus the version bump. `@deprecated` JSDoc on `/node` and `/node-gpu`. UMD-with-pinned-versions docs. "Nothing changes unless you want it to" migration guide.

**Why it exists:**
- A9's v3 cleanup is unscheduled. Users need to see the direction before then or they'll be surprised.
- JSDoc on existing exports is a docs change → tsc and IDEs warn during the v2.x lifespan, giving users a grace window measured in minors rather than across a major boundary.
- MIGRATION.md content isn't meaningful until the capabilities it describes exist. This epic trails the earlier work by design.
- Covers open arch #6 (UMD global for ONNX — `window.ort` preloaded, pinned versions).

**Semver:** patch if docs + JSDoc only. Minor if it also adds runtime deprecation warnings (observable behavior change).

---

## Epic 7 — Breaking cleanup *(major — 2.0)*

**Scope:** A9 in full.
- Remove `/node`, `/node-gpu` subpaths.
- Relocate TF.js peer dep from core to TF.js model packages.
- Retrofit existing TF.js model packages to factory-export shape (or grandfather — see open arch #4).
- Drop legacy tooling (pre-`exports` TypeScript, old webpack).

**Why it exists:**
- The only genuinely breaking work in the plan. There's no additive way to remove an entry point or change a peer-dep requirement.
- Scheduled last because open arch #8 says timing needs v2 adoption data. Each 1.x minor's NPM download stats tell you who still imports `/node` vs the root entry — you can price the disruption before cutting the major.

**Depends on open arch #4:** if existing TF.js packages get grandfathered (not retrofitted), Epic 7 shrinks and may not be worth cutting at all.

---

## Sequencing

Critical path for the ONNX payoff: **1 → 4 → 5**.

Parallelizable once Epic 1 lands:
- **Epic 2** (Workers) independent of all ONNX work.
- **Epic 3** (hosting) independent of Epics 2, 4. Long lead time on unknowns.
- **Epic 4** depends on Epic 1 only.

**Epic 6** piggybacks on any later minor.
**Epic 7** waits on adoption telemetry from 1.x minors.

### Main tradeoff

Epic 3 is the largest and least-scoped (IndexedDB UX, CDN operational learning, PM behavior audit). Two orderings:

- **(a) Epic 3 before Epic 5.** First ONNX model benefits from a mature cache. Safer. One production surface to debug at a time.
- **(b) Epic 5 with a minimal cache, harden Epic 3 after.** ONNX speedup reaches users sooner. More concurrent risk.

Recommendation: **(a)**, given solo-maintainer + agent-workforce constraints (H1).

---

## Proposed release mapping

| Release | Epic(s) | Semver | Notes |
|---|---|---|---|
| 1.(n+1).0 | Epic 1 | minor | Engine seam. No behavior change. |
| 1.(n+2).0 | Epic 2 | minor | Workers ships for existing TF.js users. |
| 1.(n+3).0 | Epic 3 | minor | `precache()`, progress API, hosting infra proven against existing models. |
| 1.(n+4).0 | Epic 4 | minor | ONNX adapter wired. Still no ONNX model. |
| 1.(n+5).0 | Epic 5 | minor | First ONNX model package. The payoff. |
| 1.(n+6).x | Epic 6 | patch or minor | Deprecation + MIGRATION.md. |
| 2.0.0 | Epic 7 | major | A9 cleanup. Post-adoption-data. |

Order of 2–4 is flexible after Epic 1. Order above optimizes for value-per-release over critical-path.
