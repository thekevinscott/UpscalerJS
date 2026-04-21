# Architecture conversation — ONNX migration

Verbatim transcript of the conversation that produced
`ARCHITECTURE-DECISION.md`. User turns and assistant turns preserved
as they were spoken, in order. Tool calls and internal tool results
are elided; only the text exchanged between user and assistant is
reproduced.

Session: `/remote-control upscaler` run, 2026-04-20 → 2026-04-21.

Handoff note: the final user request ("Please open a branch with 1)
this transcript verbatim, and 2) a summary document...") is the
impetus for this file and the sibling `ARCHITECTURE-DECISION.md`.
Reading `ARCHITECTURE-DECISION.md` first is recommended; this
transcript is the paper trail behind those decisions.

---


## User

Familiarize yourself with https://github.com/thekevinscott/UpscalerJS/pull/1301


## Assistant

PR 1301 read. Closed. Spike: parallel `packages/upscalerjs-onnx/` exploring ONNX Runtime as TF.js replacement. 10 commits, 3485 additions.

Key artifacts:
- `packages/upscalerjs-onnx/src/` — mirror of `upscalerjs/` public API, backed by `onnxruntime-web`
- `benchmark/` — Node + headless-browser perf harness, esrgan-medium x4 parity (~1.7e-6 diff)
- `PORT-DECISION.md` + `PORT-PLAN.md` — go/no-go doc + phased handoff

Benchmark highlights:
- Node/CPU: ONNX 2.3× on patch-loop, 8.5× cold start
- Browser WASM: tfjs-wasm 1.3× faster (flips Node result)
- WebGPU on M3 Max: hit wide-Concat correctness bug on Apple Metal; `split-concat.py` workaround committed

Custom-ops blocker: `esrgan-thick` can't round-trip via `tf2onnx` (`MultiplyBeta`, `PixelShuffle4x`). `medium`/`slim`/`legacy-psnr` convert clean.

Proposed rollout: v2 single `upscaler` package, dual-backend, engine picked by `ModelDefinition.engine` discriminator. Not user-facing flag.

PR closed — status unclear from metadata. Want me dig into `PORT-DECISION.md` / current repo state to see what next step is?


## User

Yes, ingest all markdown files


## Assistant

All 5 markdown files ingested. Full picture:

**Spike scope**
- Parallel `packages/upscalerjs-onnx/` package — mirror of `upscalerjs/` API backed by `onnxruntime-web`
- Benchmark harness (Node + headless browser, full backend matrix)
- Decision + execution plan docs

**Perf data**
| Path | TF.js | ONNX | Winner |
|---|---|---|---|
| Node CPU patch-loop | 676ms | 291ms | ONNX 2.3× |
| Browser WASM | 392ms | 594ms | TF.js 1.5× |
| Browser WebGL | 183ms | n/a (static-shape) | TF.js |
| Browser WebGPU (M3 Max) | 82ms | 121ms | TF.js 1.5× |

Parity ~1.7e-6 across sizes.

**Blockers surfaced**
- `esrgan-thick` + `esrgan-legacy/gans` need Python custom-layer mirrors (`MultiplyBeta`, `PixelShuffle4x`) for tf2onnx
- ORT-Web WebGPU Concat bug on Apple Metal / `maxStorageBuffersPerShaderStage=8` — silent garbage output. Workaround `split-concat.py` mandatory per-model
- ORT WebGL EP rejects dynamic shapes; needs fixed-size re-export

**Recommendation (PORT-DECISION.md)**
Port. Dual-backend v2, TF.js default, `backend: 'onnx'` opt-in. ONNX default at v3.

**PORT-PLAN.md phases (8.5–14 days agent work)**
0. Repo prep · 1. Backend seam (throw-only) · 2. Promote ONNX into main pkg · 3. tf2onnx conversion pipeline · 4. Day-one models (esrgan-medium + default) · 5. Bundle hygiene (dynamic-import proof) · 6. MIGRATION.md · 7. Beta release

**Rationale core**
TFJS 4.22.0 last release 2024-10-21 (18mo silent, 0 releases). ORT 11 releases same window, active WebGPU work. Google signals de-prioritisation (LiteRT).

**Open questions from PORT-DECISION**
1. Go/no-go on v2.0 dual-backend
2. Which 1–2 models ship ONNX day one (rec: esrgan-medium + default-model)
3. Budget for esrgan-thick custom-layer Python work

PR closed — status of decision not in docs. What next?


## User

Generally I am fairly hands off with LLM interactions. With this library in particular I want to treat very carefully. It has non-negligible downloads and I want to make sure I'm involved in all architecture decisions.

Today we only support Tensorflow.js (point A). We want to add support for ONNX (point B). Sketch me out - concisely - what a migration path would look like. You can use this PR as a guiding light.


## Assistant

# Migration sketch: TF.js (A) → dual → ONNX (B)

Three-stage shape. Each stage lands independently, each has clear user-visible contract.

## Stage 0 — Decide selection mechanism (blocking, architecture call)

PR inconsistent here. Two options on table:

**Option 1: constructor flag** (`new Upscaler({ backend: 'onnx', model })`)
- Pro: one flag, easy mental model
- Con: user must know which models fit which backend

**Option 2: model-driven discriminator** (`modelType: 'onnx'` on ModelDefinition; backend inferred)
- Pro: model packages self-describe; no wrong combinations possible
- Con: adds discriminated-union surface to public type

Recommend **Option 2**. Matches how `@upscalerjs/*` model packages ship today — backend is a property of weights, not user intent. Flag becomes redundant.

## Stage 1 — Dual-backend seam, zero user impact (v2.0)

- Main `upscaler` package gains `src/onnx/` alongside `src/tfjs/` (or current equivalent)
- Dispatch via `model.modelType` discriminator
- Dynamic `import()` per-backend — TF.js users ship zero ONNX bytes, vice versa
- Public API unchanged. Existing code keeps working on existing models
- Ship with **one** converted model (esrgan-medium x4) + parity tests vs TF.js output (~5e-3 threshold)
- TF.js stays default; no user action needed

Gate: bundle-size test proves isolation. If either runtime leaks, stage doesn't ship.

## Stage 2 — Model catalogue coverage (v2.x, incremental)

Each `@upscalerjs/<model>` package gains `/onnx/<scale>` subpath export. Migration per-package, own schedule.

Conversion pipeline lives in `tools/tf2onnx/`:
- Reproducible `make` target per model
- Python custom-layer registry (`MultiplyBeta`, `PixelShuffle4x`, others as discovered)
- `split-concat.py` post-processing mandatory until ORT-Web fixes upstream
- Parity gate: max-abs < 1e-4 vs Keras reference, else fail build

**Blockers to call out early:**
- `esrgan-thick*` + `esrgan-legacy/gans` need Python re-author of custom Keras layers. Budget call: do it, or ship without those on ONNX path
- Browser WebGPU 1.5× slower on M3 Max for ESRGAN-medium. User-visible regression if/when ONNX becomes default

## Stage 3 — Flip default (v3.0, semver-major, deferred)

Only when model coverage + browser WebGPU perf close the gap. Not scheduled now.

Later: retire TF.js path at v4.0 if adoption moves.

## What I'd push back on in PR plan

- **8 phases as one PR is too much.** Stage 1 (seam + one model) is one PR. Stage 2 is N PRs. Review cadence matters for a library with real users.
- **"Delete the spike package in the final commit"** buries the benchmark harness. Keep it running; it's ongoing evidence for v3 flip decision.
- **WebGL EP static-shape requirement not addressed.** If Safari/older browsers fall back to WebGL, ORT path silently loses a tier TF.js has. Needs explicit fallback story before default flip.
- **Peer-dep optional install UX.** `npm install upscaler onnxruntime-web` — users get cryptic runtime error if they forget. Need loader that throws early with actionable message.

## Decisions I need from you before stage 1 starts

1. Selection mechanism — flag vs discriminator vs both
2. Stage 1 scope — one model or two (esrgan-medium only, or +default-model republish)
3. Stage 2 model priority order — thick first (hardest) or slim first (easiest)
4. Whether to commit to v3 default-flip timeline, or keep open-ended


## User

Stage 0 - definitely option 2. Models define their engine. But a big concern we discussed is, today (read upscalerjs.com docs) you need to import the correct upscaler implementation that matches your TFJS environment (you don't necessarily have to import TFJS, but if you do it needs to match). How does this play with ONNX? ONNX across environments, _and_ ONNX vs TFJS.

The ideal world: a user imports Upscaler, and it just works (TM). The further we get from that the worse.

Stage 1 - don't even have to ship with a model, users don't even have to know it's happening I think.

Stage 2 - no, old models don't need conversion. ONNX only for new models going forward. Models only should ever support a single engine.

Stage 3 - Nope, no default exists, the model defines it.


## Assistant

# Revised migration — locked on your constraints

## Environment matrix today (A)

| entry | runtime | peer dep |
|---|---|---|
| `upscaler` | browser | `@tensorflow/tfjs` |
| `upscaler/node` | node | `@tensorflow/tfjs-node` |
| `upscaler/node-gpu` | node | `@tensorflow/tfjs-node-gpu` |

User imports matching entry for their env. Peer dep version must match.

## Environment matrix after ONNX (B)

Same three entries. ONNX simplifies one dimension — `onnxruntime-node` collapses CPU+CUDA+CoreML+DirectML into one package (runtime provider selection). So no `/node-gpu` analog needed on ONNX side; ORT users stay on `/node`.

| entry | TFJS model | ONNX model |
|---|---|---|
| `upscaler` (browser) | peer: `@tensorflow/tfjs` | peer: `onnxruntime-web` |
| `upscaler/node` | peer: `tfjs-node` | peer: `onnxruntime-node` |
| `upscaler/node-gpu` | peer: `tfjs-node-gpu` | peer: `onnxruntime-node` (same as /node) |

**"Just works" test:** user imports `upscaler`, passes any model, works. Entry-point choice = env only. Engine = model. Peer dep = whichever runtime model needs.

Only time user thinks about engine: installing peer dep. Error must be loud + actionable:

```
Upscaler: model @upscalerjs/real-esrgan/x4 requires onnxruntime-web.
Run: npm install onnxruntime-web
```

Thrown at `new Upscaler({ model })`, not later. No silent fallback.

## Stage 1 — invisible seam (v2.0 or v1.x minor)

Could ship as minor. No user-observable change.

- Add `modelType: 'tfjs' | 'onnx'` to `ModelDefinition` (optional, defaults `'tfjs'` — old model packages unchanged)
- Dispatcher in each entry (`browser/index.ts`, `node/index.ts`, `node-gpu/index.ts`) branches on `model.modelType`
- ONNX branch: `await import('../onnx/...')`, which does `await import('onnxruntime-web')` (or `-node`)
- Both ONNX runtimes become **optional peer deps**
- Ship without any ONNX model. No conversion work. No tests against real ONNX weights beyond a synthetic fixture
- Bundle-size gate: TFJS-only user's bundle must contain zero ORT bytes (tree-shake proof in rollup + esbuild + webpack + vite — at minimum rollup)

What lands:
- `src/onnx/` directory with promoted spike code (`tensor.ts`, `tensor-utils.ts`, `upscale.ts`, `loadModel.browser.ts`, `loadModel.node.ts`)
- Peer-dep-missing loader error
- One synthetic ONNX fixture test proves dispatch works end-to-end

Nothing for users to migrate. Nothing in docs except "heads up — next model ships ONNX."

## Stage 2 — new models land as ONNX, old models stay TFJS forever

Each model package is single-engine. No `/tfjs/` vs `/onnx/` subpaths — package declares its engine via `modelType` in its `ModelDefinition` and never changes.

- Existing `@upscalerjs/esrgan-medium`, `-slim`, `-thick`, `-legacy`, `maxim-*`, `default-model`, `pixel-upsampler` → untouched. TFJS forever.
- New models → new packages → `modelType: 'onnx'` from day one.
- Conversion tooling lives in the new model package's own build, not a central `tools/tf2onnx/`. Each package owns its weights pipeline.
- `split-concat.py` transformation stays committed per-package until ORT-Web fixes upstream. File a tracking issue upstream; link it from each model's README.

Consequence: no custom-layer Python work ever needed. `esrgan-thick` conversion blocker goes away — you're not converting it.

## Stage 3 — does not exist

No default. No flip. `new Upscaler()` without a model already errors (or uses `default-model`, which stays TFJS). Models carry engine; entry point carries env; nothing else to change.

## Open architecture questions

1. **`default-model`** — today `new Upscaler()` with no args loads it. Stays TFJS forever under your rules. Fine. But if a new ONNX-only `default-esrgan-v2` ever wants to replace it, that's a semver-major on the root package. Flag now so it's a conscious choice later.

2. **Peer-dep error UX** — worth prototyping before stage 1 ships. Missing `onnxruntime-web` at `new Upscaler({ model: onnxModel })` must produce a readable error in the browser devtools, not a cryptic module-resolution failure. Loader should try/catch the dynamic import and rethrow with install instructions.

3. **Bundle-size gate strictness** — if a user imports both a TFJS model and an ONNX model in the same app, both runtimes ship. Expected. But if a user imports only TFJS models and `onnxruntime-web` leaks in via dead-code-elimination failure, that's a regression. Need CI gate on at least one bundler, ideally three (different tree-shaking quality).

4. **Version-pin strategy on ORT** — ORT-Web shipped 11 releases in 18 months. Pin `^1.24`? Accept risk of 1.25 breaking something? Or tighter pin + dependabot? Same call TFJS never forced because TFJS stopped shipping.

5. **Docs site (upscalerjs.com)** — stage 1 adds nothing user-visible; docs can stay silent. Stage 2 first ONNX model needs an "Engines" explainer page. Minimal: "each model ships with one engine; install the matching peer dep." No backend flag to document.


## User

"Thrown at new Upscaler({ model }), not later. No silent fallback."

This is a runtime error. Not ideal.

Let's not use `modelType`, that's overloaded I think - let's use `engine`.

I really think the big open decisions I don't understand are:

* How imports change, how installs change. Walk me through from the perspective of a developer
* Model ecosystem. I think we'd discussed in the PR that we'd continue having NPM packages (good discoverability, good install for JS users; limited file size maximum); Hugging Face packages (good discoverability; unlimited maximum file size; possible CDN limits; unknown to JS devs; rate limits); Github Releases (unlimited rate limits; bad discoverability). I think we'd said, host on HF, publish to NPM, have a postInstall step that pulls from GH releases. 

Both of these are huge decisions that we need to get right at the beginning. The goal of this library is zero config, as easy as possible to install and use. That means UMD support in the browser, ESM as well and of course Node, + GPU where available. And with appeal to JS devs firstly. And also appeal to agents nowadays.


## Assistant

# Naming + runtime-error fix

Rename confirmed: `modelType` → `engine` in `ModelDefinition`. Discriminator: `engine: 'tfjs' | 'onnx'`.

Runtime-error concern is real. Fix: **runtime is a dep of the model package, not a peer dep**. User never has to know.

```json
// @upscalerjs/real-esrgan/package.json
{
  "dependencies": {
    "onnxruntime-web": "^1.24"
  }
}
```

User: `npm install upscaler @upscalerjs/real-esrgan` → npm pulls onnxruntime-web automatically. No peer-dep warning. No runtime error. Nothing to configure.

Same pattern retro-applied to existing TFJS model packages (move `@tensorflow/tfjs` from peer → dep). Consistent. Both engines invisible to user.

Core `upscaler` package: zero runtime deps. Stays thin.

npm dedupes if user has multiple ONNX models → single `onnxruntime-web` in tree.

---

# Developer walkthrough

## A: today (TFJS, ESM, bundler)

```
npm install upscaler @upscalerjs/esrgan-medium @tensorflow/tfjs
```
```js
import Upscaler from 'upscaler';
import model from '@upscalerjs/esrgan-medium/x4';
new Upscaler({ model });
```
User picks peer dep. Three installs. Three decisions.

## B: after (ESM, bundler, either engine)

```
npm install upscaler @upscalerjs/real-esrgan
```
```js
import Upscaler from 'upscaler';
import model from '@upscalerjs/real-esrgan/x4';
new Upscaler({ model });
```
Two installs. One decision (which model). Runtime invisible.

If model is TFJS-engine: same two-install shape. `@upscalerjs/esrgan-medium` depends on `@tensorflow/tfjs` internally. User doesn't care.

## A/B: Node

```
npm install upscaler @upscalerjs/real-esrgan
```
```js
import Upscaler from 'upscaler/node';
// or 'upscaler/node-gpu' for TFJS-GPU
import model from '@upscalerjs/real-esrgan/x4';
new Upscaler({ model });
```
Entry-point picks env (browser vs node). Model picks engine. Model package pulls matching runtime. ONNX doesn't need `/node-gpu` — `onnxruntime-node` handles CPU + CUDA + CoreML + DirectML at session create.

## A: today (UMD, script tag)

```html
<script src="https://unpkg.com/@tensorflow/tfjs"></script>
<script src="https://unpkg.com/upscaler"></script>
<script src="https://unpkg.com/@upscalerjs/esrgan-medium"></script>
<script>new Upscaler({ model: UpscalerJS.EsrganMedium.x4 });</script>
```

## B: after (UMD)

```html
<!-- model UMD bundle inlines the runtime it needs -->
<script src="https://unpkg.com/@upscalerjs/real-esrgan/dist/umd.js"></script>
<script src="https://unpkg.com/upscaler"></script>
<script>new Upscaler({ model: UpscalerJS.RealEsrgan.x4 });</script>
```

Or, if model UMD stays small and expects runtime on page:

```html
<script src="https://unpkg.com/onnxruntime-web/dist/ort.min.js"></script>
<script src="https://unpkg.com/@upscalerjs/real-esrgan"></script>
<script src="https://unpkg.com/upscaler"></script>
```

Trade-off to decide: inline runtime in model UMD (bigger download, one script tag) vs. require user to add runtime script (smaller, two script tags). Recommend inline — matches "zero config" goal. Script-tag users copy one line from docs.

## Key invariant

Core `upscaler` package never changes imports. `upscaler`, `upscaler/node`, `upscaler/node-gpu` stay as-is. Engine flows through the model, not through import path.

---

# Model hosting — push back on postInstall

Your sketch: NPM stub + postInstall pulls from GH Releases, with HF as mirror.

I'd drop the postInstall step. Reasons:

- Breaks offline installs (corp, air-gapped, CI with no network)
- npm hash doesn't cover downloaded files → cache invariants silently broken
- postInstall scripts blocked by some security tooling (`--ignore-scripts`)
- Failure at install time is worse UX than failure at first-use — install errors are cryptic, first-use errors can point at the CDN, retry, and cache

Existing UpscalerJS already lazy-loads weights from CDN on first use. Keep that. Tier the origins:

| Tier | Host | Use |
|---|---|---|
| Primary | GH Releases | unlimited rate, stable URLs, no cost |
| Secondary | HuggingFace | ML discoverability, SEO, model cards |
| Tertiary (opt-in, small models only) | NPM package inlines weights | offline install path for ≤10MB models |

Model package contains:
- `ModelDefinition` with ordered URL list (GH Releases first, HF fallback)
- Loader retries down the list on 4xx/5xx
- IndexedDB cache in browser, fs cache in node, keyed by weight hash
- For small models (under ~5MB): ship weights inside the NPM tarball too; loader checks local first, skips network entirely

Optional build tool: `upscalerjs prefetch` CLI pulls weights at build time, writes to `public/` or similar, updates `ModelDefinition` to point at local URL. Deterministic-build users get their escape hatch without postInstall side effects.

HF mirror serves double duty:
- ML devs search HF → find model → see it's consumable via npm
- JS devs search npm → find model → don't need to know HF exists
- Mirror broken ≠ library broken; primary stays GH Releases

## Specific decisions still open

1. **Inline-weights threshold.** Ship inside NPM tarball if weights < N MB? `N = 5`? `N = 10`? `default-model` should definitely inline (`new Upscaler()` with no args should work offline after `npm install`). Large models never inline.
2. **Pin strategy for ORT.** Each ONNX model package pins `onnxruntime-web` at a known-good version. If model A depends on `^1.24` and model B on `^1.26`, npm resolves one. Need a compat policy — probably `~1.24` (patch-only) and deliberate bumps across all model packages together.
3. **Cache invalidation.** Weight hash in URL or filename. If a model package rev'd but URL same, browser cache stale. Hash-in-URL fixes it; slight ugliness.
4. **HF mirror automation.** Mirror is useless if it drifts. Needs CI job that publishes to GH Releases → pushes to HF. Otherwise skip HF and rely on GH Releases + SEO on the npm README.

## Zero-config score

Under this shape, ESM bundler path is two installs, three lines of code, no peer-dep decisions, no runtime awareness. UMD path is three script tags, no config. Both about as good as library of this shape gets without full bundler integration (which is a separate project).


## User

Let's focus exclusively on the import question, and remain concise. I'm not convinced. Don't users then lose the ability to download offline?


## User

[Request interrupted by user]


## User

Let's focus exclusively on CDN / model hosting. I'm not convinced. Don't users then lose the ability to download offline?


## User

Sorry ignore that last message. On the imports - doesn't the package default to installing TFJS today? what happens if a user omits installing TFJS?


## Assistant

Checked `packages/upscalerjs/package.json`:

```json
"peerDependencies": { "@tensorflow/tfjs": "~4.11.0" },
"dependencies": { "@upscalerjs/default-model": "workspace:*" }
```

TFJS is **peer dep** today, not regular dep. So behavior when user omits:

| pkg manager | outcome |
|---|---|
| npm 7+ | auto-installs peer → works |
| npm <7 | warning at install, `Cannot find module @tensorflow/tfjs` at import |
| pnpm | warning, no auto-install, runtime error at import |
| yarn classic | warning, runtime error at import |
| yarn berry | configurable; usually requires explicit install |

So today's "just works" is npm-7+-only. pnpm/yarn users already hit a failure mode.

My prior suggestion (runtime as **regular dep** of model package) is strictly better than today — auto-installs on every pkg manager, no peer-dep warnings, no runtime import errors. Offline story unchanged: `npm install` pulls dep into `node_modules` same as any other dep; subsequent offline usage works. No postInstall, no network beyond normal npm resolution.

Offline concern only bites if weights-download happens at first use (separate question from runtime install). Runtime binary itself lives in `node_modules/onnxruntime-web/dist/` after install — offline-safe.

So: move TFJS from peer → dep on model packages too (not on core `upscaler`). Consistent with ONNX packages. Users stop seeing peer-dep warnings. Core stays thin.

Only loss: users who deliberately want a different TFJS version than model package pins. Edge case; `overrides` in package.json handles it.


## Assistant

Fair pushback. My prior framing overreached — I jumped to runtime-fetch as default. Wrong. Offline breaks and that's a regression vs today.

# Today's actual state

NPM model packages ship weights **inside the tarball** (`model.json` + shards). `npm install` gets you everything. Offline works out of the box. CDN (unpkg/jsdelivr) is just a mirror of that same tarball for script-tag users.

Don't break this. It's load-bearing.

# Revised hosting shape

## Default: NPM-inline (preserves today's behaviour)

Weights ship in NPM tarball. `npm install @upscalerjs/real-esrgan` pulls weights + `ModelDefinition` + runtime (`onnxruntime-web`) in one go. Offline works. Air-gapped installs work. CI caches work. No postInstall. No first-use network call.

Same for ONNX models as TFJS today. Single `.onnx` file inside the NPM package instead of `model.json` + shards. Simpler, actually.

## Exception: models that genuinely exceed NPM

Cutoff policy (pick one): 50MB, 100MB. NPM hard cap is 256MB but install UX degrades long before. Recommend **50MB soft cap**.

Above cutoff, model package ships **NPM stub** (just `ModelDefinition` + weight URL + loader) and weights live on GH Releases (primary) + HF mirror (discoverability).

For these large models:
- First `upscale()` call fetches from GH Releases → caches locally (IndexedDB browser, fs node)
- Offline users run `upscalerjs prefetch @upscalerjs/<big-model>` once; writes to cache dir; all subsequent use offline
- Docs mark these models clearly: "requires network on first use OR `prefetch` step"

This is opt-in pain for models that can't physically fit NPM. Users who need those models know they're big. Users who want zero-config stick with NPM-inline models.

## Concrete size audit for existing + planned

| Model | Size | Channel |
|---|---|---|
| esrgan-medium (all scales) | ~2.8MB | NPM-inline |
| esrgan-slim | small | NPM-inline |
| esrgan-legacy/psnr-small | small | NPM-inline |
| esrgan-thick | ~28MB | NPM-inline (under 50MB) |
| pixel-upsampler | tiny | NPM-inline |
| default-model | = esrgan-medium today | NPM-inline |
| maxim-* | ? (TBD, some variants large) | audit each; probably split |
| Future Real-ESRGAN / SwinIR / HAT ONNX | TBD | audit each |

Everything existing comfortably fits NPM-inline. Rule only kicks in for future models that happen to be huge.

## HF mirror — optional, not critical path

HF mirror serves two non-critical goals:
- ML devs discover the model on HF → see it's usable via npm
- Secondary fetch source if GH Releases 4xx/5xx (rare)

Mirror out of sync = not broken, just stale on HF side. Primary is NPM (small/medium) or GH Releases (large). HF never on critical path.

Set up with CI job that pushes on release: `publish-npm → publish-gh-release → push-hf`. If HF sync breaks, fix later, no user impact.

## What changes from today

Almost nothing for small/medium models. Users import the model, weights come along, offline works.

Only change: engine is a property of the model package. If model ships as ONNX-engine, its runtime dep (`onnxruntime-web`) pulls automatically. Invisible.

## Open questions

1. **Exact size cutoff.** 50MB feels right for NPM UX. Your call — depends on tolerance for slow `npm install`.
2. **Prefetch CLI scope.** Only needed if you ever ship a model that exceeds cutoff. Can defer until first large model is on deck.
3. **HF mirror — do it now or later?** Discovery benefit is real (ML crowd searches HF) but it's a separate project. Defer unless you want to ship it alongside first ONNX model.
4. **GH Releases naming convention.** If/when needed: `v<model-version>/<model-name>-<scale>.onnx`? Hash-suffixed? Pins model asset to package version so cache-bust is natural.

Net: offline story preserved for everything currently in the library. Escape hatch exists for future outliers.


## User

Let's ignore yarn and npm < 7. Only latest npm and latest pnpm.

Let's focus exclusively on the ONNX case. Walk me through DX. What's that look like


## Assistant

# ONNX DX walkthrough

## Shape (decided)

Model package has `onnxruntime-web` as **regular dep** (not peer). Works browser + Node (pure WASM). Core `upscaler` stays runtime-free.

## Browser + ESM bundler

```
npm install upscaler @upscalerjs/real-esrgan
```

Pulls: `upscaler`, `@upscalerjs/real-esrgan`, `onnxruntime-web`.

```js
import Upscaler from 'upscaler';
import model from '@upscalerjs/real-esrgan/x4';
const u = new Upscaler({ model });
await u.upscale(img);
```

Dispatcher reads `model.engine === 'onnx'` → `await import('./onnx')` → `await import('onnxruntime-web')`. Dynamic import tree-shakes; TFJS-only bundles ship zero ORT bytes.

WASM binaries: ORT loads `.wasm` from jsDelivr CDN by default. Zero config.

## Browser UMD

```html
<script src="https://unpkg.com/onnxruntime-web/dist/ort.min.js"></script>
<script src="https://unpkg.com/upscaler/dist/umd/upscaler.min.js"></script>
<script src="https://unpkg.com/@upscalerjs/real-esrgan/dist/umd/index.min.js"></script>
<script>
  const u = new Upscaler({ model: UpscalerJS.RealEsrgan.x4 });
</script>
```

Three tags. Same pattern as TFJS UMD today. `upscaler` UMD reads `window.ort` at dispatch.

## Node (zero-config, WASM)

```
npm install upscaler @upscalerjs/real-esrgan
```

```js
import Upscaler from 'upscaler/node';
import model from '@upscalerjs/real-esrgan/x4';
const u = new Upscaler({ model });
```

`onnxruntime-web` WASM runs in Node too. Slower than native C++ bindings but functional. No extra install.

## Node (opt-in native perf)

```
npm install upscaler @upscalerjs/real-esrgan onnxruntime-node
```

Same code as above. `upscaler/node` dispatcher:

```js
let ort;
try { ort = await import('onnxruntime-node'); }   // native: CPU + CUDA + CoreML + DirectML
catch { ort = await import('onnxruntime-web'); }  // fallback: WASM
```

Prefers native if present. User opts in with one extra install. No code change.

## Summary table

| Env | Install | Code change vs today | Runtime |
|---|---|---|---|
| Browser ESM | `npm i upscaler @upscalerjs/<model>` | none | ORT-Web (auto) |
| Browser UMD | 3 script tags | none | `window.ort` |
| Node (WASM, default) | `npm i upscaler @upscalerjs/<model>` | none | ORT-Web (auto) |
| Node (native, opt-in) | `+ onnxruntime-node` | none | ORT-Node (auto-detected) |

## What user never does

- Pick `backend` flag
- Install peer dep explicitly  
- Import engine-specific entry
- Configure WASM paths (CDN fallback handles it)
- Handle "runtime not found" errors

## Trade-offs you're accepting

1. **Node default slow path.** Zero-config Node users on WASM, not native. ~2-5× slower than `onnxruntime-node`. Docs call out the upgrade path.
2. **Bundle dup if mixed TFJS+ONNX models.** User with both engines ships both runtimes. Expected; npm dedupes where possible.
3. **ORT version pin lives in model package.** Two model packages pinning different minor ORT versions → npm resolves to one satisfying both ranges. If incompatible, install fails loudly. Policy: all `@upscalerjs/*` ONNX models pin same `~1.24` (patch-only); bump in lockstep.
4. **UMD needs runtime preloaded.** Can't dynamic-import in UMD. User adds `<script src="ort.min.js">` before `upscaler`. Matches TFJS pattern.

## What's still open

1. Should `upscaler/node` default-prefer `onnxruntime-node` if installed, or require explicit opt-in via config? Recommend auto-detect (try-import pattern above) — one less decision.
2. Version range strategy for ORT — `~1.24` across all ONNX model packages, or loose `^1.24`? Recommend `~` (patch-only) plus a monorepo script that bumps all models together.


## User

Let's keep things concise. This is meant to be a back and forth exercise. Probe the problem space and understand.

Today we have an NPM-exclusive approach. What are the benefits? I see a few: users stay in the NPM ecosystem, they get files locally and can choose to run offline or serve them via a URL. There's no postinstall step.

Really NPM is the ideal. The _only_ reason we're discussing non-exclusive NPM is file size (and I suppose discoverability from HF, but we could add that later if we wnted it.)


## Assistant

Agreed. NPM is the default, single reason to deviate is size.

One split to probe: NPM has two ceilings, not one.

1. **NPM registry** — 256MB hard cap, UX degrades past ~50MB
2. **jsdelivr/unpkg** — CDN re-serves NPM packages, but have their own limits (jsdelivr ~150MB per file, unpkg tighter). Matters for UMD/script-tag users.

So a 100MB model could install fine via `npm install` but break for script-tag users hitting the CDN. Two different users, two different ceilings.

Question back: what's the biggest model you realistically want to ship? Rough ranges for SR models:
- Real-ESRGAN: 60–70MB
- SwinIR: 130MB
- HAT large: 200MB+
- MaxIM variants: up to 100s of MB

If your roadmap stays under ~50MB, NPM-exclusive is fine forever and this whole conversation is moot. If SwinIR/HAT are on the list, CDN ceiling bites before NPM ceiling does — and that's the case that forces external hosting.

Which end of the range are you actually targeting?


## User

Please stay concise, do not get ahead of me.

Instead of the try / catch block- what does it look like to allow dependency injection


## Assistant

# DI shape

```js
import Upscaler from 'upscaler/node';
import * as ort from 'onnxruntime-node';
import model from '@upscalerjs/real-esrgan/x4';

const u = new Upscaler({ model, runtime: ort });
```

Constructor accepts optional `runtime`. If passed → used directly. If absent → dispatcher dynamic-imports default (`onnxruntime-web`).

Mirrors existing `getUpscaler({ tf, ... })` factory pattern.

## Contract

`runtime` is whatever module exposes `InferenceSession` (both `onnxruntime-web` and `onnxruntime-node` do). Type-narrowed on `model.engine`.

## DX impact

| Path | Install | Code |
|---|---|---|
| Node WASM (default) | `npm i upscaler @upscalerjs/<model>` | `new Upscaler({ model })` |
| Node native (opt-in) | `+ onnxruntime-node` | `new Upscaler({ model, runtime: ort })` + 1 import |
| Browser | unchanged | `new Upscaler({ model })` |
| Testing | — | `new Upscaler({ model, runtime: mockOrt })` |

Trade vs try/catch: user types one extra import + one extra field for native perf. Gains: explicit, no magic resolution, unit-testable.


## User

1GB


## Assistant

That settles it. 1GB > every NPM/CDN ceiling. External hosting mandatory for any model near that size. Two-path story is unavoidable — NPM-inline for small, external for large.

Real questions now:

1. **First-use UX for a 1GB fetch.** User does `new Upscaler({ model })` on a slow connection — what do they see? Progress event? Indeterminate spinner? Fail-fast on network error? This is the whole experience for large-model users.

2. **Prefetch CLI vs. Node-side autoload.** In Node, 1GB fetch on first run inside a server request handler = timeout. Needs explicit prefetch step OR eager fetch at `import`. Browser is more forgiving (user kicks off an action and waits).

3. **Where is 1GB coming from?** One specific model on the roadmap, or aspirational ceiling? Matters because if it's one model and the rest are <100MB, the external path is rare-path and can be slightly clunky. If half the catalogue is >200MB, external path is common and needs to be polished.

4. **Cache dir location.** Browser: IndexedDB (quota ~50% of disk, variable per vendor — Chrome gives plenty, Safari stingy). Node: `~/.cache/upscalerjs/`? Project-local? User config? Cache eviction policy?

Which of these is most worth pinning down first?


## User

Ok, I don't think I like that. I don't want Upscaler tied to an engine, I want the _model_ tied to an engine. Right now we pass model as an argument which is nice; I suppose we could _also_ turn it into a constructor (and if not explicitly called, it gets called in upscaler):

```
new Upscaler(model(ort))
```

How does that feel?

If we do it this way - then if `ort` is not supplied we fall back to regular onnxruntime. Does that imply that we have a (potentially) extra dependency? Maybe that doesn't matter if its not imported.


## Assistant

# Feel

Clean. Model owns engine binding. Upscaler stays engine-agnostic. Matches your mental model ("model ties to engine, not upscaler").

## Shape

```ts
// model package
export default (runtime?: Runtime) => ({
  engine: 'onnx',
  session: async () => {
    const ort = runtime ?? await import('onnxruntime-web');
    return ort.InferenceSession.create(...);
  },
  // ...rest of ModelDefinition
});
```

```ts
// upscaler
new Upscaler(model);         // model auto-called, default runtime
new Upscaler(model(ort));    // explicit runtime

// internally:
const resolved = typeof m === 'function' ? m() : m;
```

## Dependency question

Yes — `onnxruntime-web` is a **regular dep** of the model package. Always installed.

Bundle impact:
- User passes `ort-node` → dynamic `import('onnxruntime-web')` is unreachable at runtime → separate chunk exists but browser never fetches it. Network cost zero.
- User passes nothing → chunk loaded on first session.
- `node_modules` size: ~6 MB extra per install regardless. Cost of being there.

Static fallback (`import ort from 'onnxruntime-web'` at module top) would always bundle. Avoid. Keep dynamic so bundlers emit a chunk that only loads on fallback path.

## Trade vs DI-only

| Concern | DI only (prev) | Factory (this) |
|---|---|---|
| Zero-config default | requires try/catch magic | clean — model resolves itself |
| Explicit runtime | `new Upscaler({ model, runtime })` | `new Upscaler(model(runtime))` |
| Upscaler knowledge of engine | bleeds through `runtime` field | none — just receives resolved ModelDef |
| Extra dep in model pkg | no | yes (`onnxruntime-web`) |
| Tree-shake when runtime provided | n/a | dynamic-import chunk unloaded |

Only real cost: 6 MB in `node_modules`. Network path clean.


## User

1 - there's two use cases, browser and Node. Browser can't avoid loading the model via URL, so whether it's served from the local file system, or from a CDN, it's the same damage. Though we will want to look into aggressive caching in ways we haven't in the past. Mark that down.

For node though, it might just load the model from disk. That's why I'm arguing for `npm install` resulting in a model on disk.


## Assistant

Right. Agreed on the framing:

- **Browser**: URL-fetch always. Source (local asset vs remote CDN) is just origin differences. Caching is the real lever.
- **Node**: disk-load is the win. NPM-inline → weights sitting in `node_modules/` → `fs.readFile()` → offline free.

This only holds up to NPM's ceiling (~256MB hard, ~50MB before install UX suffers). For a 1GB model, Node loses the disk-load advantage because weights can't fit NPM either.

Logged: **aggressive browser caching strategy (IndexedDB vs Cache API + service worker vs Blob URLs)** as a separate research item.

Now the sharp question for Node >NPM-cap:

| Option | Install UX | Offline | CI |
|---|---|---|---|
| **postInstall** fetches to `node_modules/@upscalerjs/<model>/weights/` | Slow install, needs network once | Works after install | Cache-friendly if hash-verified |
| **First-use fetch** to `~/.cache/upscalerjs/` | Fast install | Breaks first run offline | Timeouts in request handlers |
| **Prefetch CLI** (`upscalerjs prefetch <model>`) | Fast install | Explicit opt-in | Deterministic |
| **User provides path** (manual download) | Manual | Yes | Yes |

You pushed on "`npm install` results in model on disk." For >NPM-cap, the only mechanism that delivers that is **postInstall**. I argued against it earlier. I was wrong to blanket-reject — for >NPM-cap Node, it's the only path that matches your "weights on disk after install" invariant.

Mitigations to my earlier concerns:
- `--ignore-scripts` users: we document that prefetch CLI is the fallback. Rare power-user case.
- Checksum verify post-download. Failure = loud error, retriable.
- Content-addressed cache (`~/.cache/upscalerjs/<hash>/`) means CI caches work if lockfile is stable.

Probe: for the 1GB-class model — is it on the 6-month roadmap, or is it the "anything goes" ceiling? If it's the ceiling and 95% of models stay <256MB, NPM-inline handles the common path and postInstall-or-prefetch is a rare-road. If 1GB is normal, the rare-road becomes the main road and needs polish.


## User

Ok. So we begin to move away from a TFJS world where we have specific upscaler imports mimicking the library imports, and instead support dependency injection. Is that fair to say? Stay concise


## Assistant

Yes, with one caveat.

**Runtime selection** → moves to DI via model factory. `upscaler`, `upscaler/node`, `upscaler/node-gpu` no longer mirror TFJS runtime split.

**Env split** → stays. `upscaler` vs `upscaler/node` still exist, but for image I/O (canvas vs node image libs), not runtime. Possibly collapses `/node-gpu` into `/node` since ORT handles providers internally.

Net: env entries stay (fewer of them), runtime becomes model's problem.


## User

Env split - why


## Assistant

Image I/O differs:

- **Browser**: `HTMLImageElement`, `HTMLCanvasElement`, `ImageData`, `Blob`, `File`, `<video>`. DOM-only.
- **Node**: no DOM. Uses `sharp`/`jimp`/node-canvas, `Buffer`, fs paths, streams.

Input accepted, output returned, pixel read-back — all differ. Node entry statically imports native image libs (`sharp` has native binary); browser must never pull those.

Could collapse via runtime `typeof window` detection, but then bundlers ship both code paths + dead-code native-binary imports leak into browser builds. Separate entries keep each environment shipping only what it needs.

So env split = image I/O boundary, not runtime boundary.


## User

it's the anything goes ceiling but most models are getting larger. it needs polish


## User

I see. And today I have specific foo.env.ts files - is that correct?


## Assistant

OK. Polished path, both environments.

## Node (postInstall as main road)

Closest analog is Playwright: `npm install playwright` → postInstall pulls Chromium to a known cache dir, hash-verified, skippable, with `npx playwright install` as explicit fallback. Applied here:

- Model NPM package: stub + `postinstall` script that downloads weights
- Cache layout: content-addressed (`<hash>/model.onnx`), not package-name-keyed
- Opt-out: `UPSCALERJS_SKIP_DOWNLOAD=1` for CI / `--ignore-scripts` users
- Fallback CLI: `npx upscalerjs install <model>` (Playwright pattern)
- Integrity: SHA256 in package.json verified post-download
- Resumable: HTTP range requests, retry with backoff
- Progress: stderr bar during install

## Browser (aggressive caching, no install-time story exists)

- First `upscale()` call: stream fetch → IndexedDB chunked write (1GB fits; quota permitting)
- Subsequent calls: IndexedDB hit, bypass network
- Expose `Upscaler.precache(model)` so apps can warm cache during idle
- Optional service worker recipe in docs for PWA story
- Content-addressed URL → natural cache-bust on weight updates
- Progress events on `upscale()` during cold fetch

## Fork worth probing

Node cache location. Two shapes, real trade-off:

**Shared cache** (`~/.cache/upscalerjs/<hash>/`) — Playwright style
- 5 projects, 1GB model, one copy on disk
- `npm uninstall` doesn't free the weights (orphan)
- Not hermetic; corp CI can dislike
- Cache-clean CLI needed

**Project-local** (`node_modules/@upscalerjs/<model>/weights/`)
- Hermetic, matches npm mental model
- `npm uninstall` cleans up
- 5 projects × 1GB = 5GB on disk
- postInstall writes into node_modules (npm supports this, slightly unusual)

Shared cache compounds advantage as model sizes grow. Hermetic-first compounds pain.

Recommend **shared cache with env-var override for hermetic mode**: `UPSCALERJS_CACHE=./node_modules/.upscalerjs-cache` or similar. Default optimizes for trend (bigger models).

Agree, or push back?


## Assistant

Yes. Pattern: `<thing>.<env>.ts`.

- `image.browser.ts` / `image.node.ts` — pixel I/O
- `loadModel.browser.ts` / `loadModel.node.ts` — weight fetch
- `args.browser.ts` / `args.node.ts` — input normalization
- `types.browser.ts` / `types.node.ts` — env-specific types

`src/shared/` holds env-agnostic logic (patch math, Upscaler class, upscale pipeline). Each entry (`src/browser/index.ts`, `src/node/index.ts`, `src/node-gpu/index.ts`) wires its `.browser.ts` / `.node.ts` siblings into the shared core via the `getUpscaler({ tf, loadModel, getImageAsTensor, ... })` factory.

Same factory seam would accept ONNX-engine implementations. Env files stay; runtime injection flows through the factory.


## User

Could those collapse into non-env files? Do we need the env split?


## Assistant

Short answer: forced by static imports of native Node modules.

**Why split sticks:**
- `sharp` (or equivalent) imported at top of `image.node.ts`. Native binary. Can't parse in browser.
- DOM types (`HTMLCanvasElement`) in `image.browser.ts`. Don't exist in Node.
- Runtime `typeof window` branching fails: top-level `import sharp from 'sharp'` evaluates before branch runs. Bundler has to tree-shake it out, which is fragile across Vite/rollup/webpack/esbuild.

**Paths to collapse:**

| Option | Cost |
|---|---|
| Runtime env detection + dynamic imports inside branches | tree-shaking fragile, bundlers leak Node code to browser |
| DI image adapter (`new Upscaler(model, { image: adapter })`) | breaks zero-config, user wires env |
| Conditional exports + single `image.ts` per entry dir | already the structure; only drops `.browser`/`.node` filename suffix |

Cleanest realistic cleanup: **drop the `.browser`/`.node` suffix** since `src/browser/`/`src/node/` dirs already encode env. Keep file-per-env. Cosmetic only.

Full collapse needs DI pattern same as runtime — trades zero-config for unified core. Not recommended unless zero-config goal softens.


## User

sharp and playwright are both great examples that we could / should follow. 

Cache location = I think local. Doesn't `pnpm` mitigate shared cache somewhat? I think it would be counter intuitive to install models globally across all projects, and it would mess with bundling for the browser.

So it seems like `postInstall` is the right decision, right? Then who is the CDN - HF or GH?


## Assistant

Agreed — local cache, postInstall, pnpm's content-addressed store covers dedup without breaking bundler asset resolution.

## HF vs GH for the CDN

**GH Releases** is the right primary. Not close.

| | GH Releases | HF |
|---|---|---|
| Bandwidth | Unlimited on public | Rate-limited on free tier |
| Per-file cap | 2GB (> your 1GB ceiling) | Unlimited |
| CDN | Fastly | CloudFront-ish |
| Auth needed | No (public) | Token for private, anon rate-limited |
| Versioning | Tags map to releases natively | Commit hashes (also fine, different mental model) |
| CI integration | Trivial (same repo) | Separate push step |
| Discovery to ML crowd | Poor | Great |
| Downtime history | Rare | More frequent |

Rate limits are the disqualifier for HF-as-primary. A popular npm install could self-DDoS the free tier. GH Releases has no anon rate limit on public repos.

**Verdict:** GH Releases primary. HF added later for discoverability — as a mirror, not critical path. Loader never falls back to HF, it just exists so ML crowd can find your models.

One GH limit worth noting: **2GB per file**. 1GB ceiling fits fine. If you ever exceed 2GB (rare for SR, plausible for diffusion), need sharding. Defer.

## Next probes

Two decisions left to nail:

1. **Repo layout for weights.** Same repo as code (one GH Releases timeline per model package), or a separate `upscalerjs-weights` repo (one releases timeline for all weights, tagged per-model)? First is clean per-package, second centralizes ops.

2. **Version coupling.** Does `@upscalerjs/real-esrgan@2.3.0` tie 1:1 to GH Release `real-esrgan-v2.3.0`? Or can npm package rev without weight re-release? Tight coupling = simpler; loose coupling = ship docs/TS fixes without re-uploading weights.

Pick one to probe next?


## User

Understood - so we need the two code paths.

Do we need the two import paths? Could we have a single upscaler import? Is detecting environment reliable? What about in between environments - like cloudflare workers?


## Assistant

# Single import — yes, via conditional exports

Modern answer: `package.json` `exports` field.

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

User: `import Upscaler from 'upscaler'` everywhere. Bundler/runtime picks correct file at resolve time.

## Reliability

Not `typeof window` at runtime — **build-time condition resolution**. Decided by the tooling:

| Tool | Picks |
|---|---|
| Webpack/Vite/Rollup (web target) | `browser` |
| Node | `node` |
| Cloudflare Workers | `workerd` |
| Deno | `deno` |
| Bun | `bun` then `node` |
| esbuild | `--conditions` flag |

Rock-solid. No runtime probing. Same mechanism `react`, `zod`, most modern libs use.

## Cloudflare Workers + similar

Needs own adapter. `sharp` won't run (native binary, workerd blocks). No DOM either. Would need WASM-based image decode (e.g. `@cf-wasm/photon`, `@jsquash/*`) or just accept `ImageData`/`ArrayBuffer` inputs.

Trade: adding `workerd` condition = one more adapter to maintain. Defer until demand appears.

## What goes away

- `upscaler/node` explicit import → gone
- `upscaler/node-gpu` → gone anyway once ONNX handles providers at session create

## What stays

- Multiple build outputs (`dist/browser`, `dist/node`) — just invisible to user
- Env-specific source files (image I/O adapters)

## Cost

- One-time `exports` field migration
- CI matrix must test per env (Node, headless browser, maybe workerd) to catch condition mis-resolution
- Legacy tooling without `exports` support (ancient webpack 4, old TS `moduleResolution`) breaks. Fine to drop in v2.


## User

That's pretty great.

So breaking changes woudl include:

* package.json exports field
* changes to import recommendations
* all models shift to dependency injection (maybe defaults can map to environments though not GPU obviously)

Anything I'm missing?


## Assistant

Probably missing:

- **`ModelDefinition` type change** — `engine` discriminator added. Model authors update their types.
- **Model export shape** — object → callable factory. Every model package's `src/index.ts` changes signature.
- **`getModel()` return type** — `tf.LayersModel` for TFJS models, `InferenceSession` for ONNX. User code that introspects leaks to engine.
- **`dispose()` semantics** — ORT `session.release()` vs `tf.Tensor` cleanup. User code relying on `tf.*` memory bookkeeping breaks under ONNX.
- **Error classes** — TFJS throws its own, ORT throws its own. Anyone catching specific error types gets surprised.
- **TFJS peer-dep relocation** — moves off core `upscaler`, onto each TFJS model package. Install instructions change for TFJS-only users too.
- **Legacy tooling drop** — webpack 4, pre-4.7 TypeScript, anything without `exports`-field support stops resolving. Document min versions.
- **`setup`/`teardown` hooks** — TFJS-only concept. ONNX models don't get them. Type union makes it explicit but it's new surface.
- **UMD global name / structure** — if `upscaler` UMD now engine-agnostic, the global might need to expose runtime lookup hooks that didn't exist before.

Biggest user-visible hit: model export shape. Every `import model from '@upscalerjs/*/x4'` caller sees the change if factory-call is required.

Mitigation option: Upscaler accepts both object and function. Objects treated as pre-resolved. Reduces churn for TFJS model users who don't care about runtime injection.


## User

GH - is there a maximum release size?


## Assistant

Per-file: **2GB** (hard cap for Free/Pro; Enterprise may differ).

No documented cap on:
- Total size of a single release (sum of all assets)
- Aggregate release storage across the repo
- Number of assets per release
- Bandwidth on public repos

Release assets are stored separately from the repo itself (not counted toward the repo's 1GB soft limit, and not using LFS so no LFS quotas apply).

Practical ceiling: a single weights file > 2GB needs sharding. Everything else is unbounded for practical purposes.


## User

do web research


## Assistant

Confirmed from GitHub docs:

- **Per-file cap**: 2 GiB (hard)
- **Assets per release**: up to 1000
- **Total release size**: no limit
- **Bandwidth**: no limit on public repos
- **Aggregate storage**: no stated cap (release assets stored separately from the 10GB `.git` soft cap)

Practical implication for UpscalerJS: 1GB models fit single file. If/when a model exceeds 2GB, shard it (up to 1000 parts in one release, concatenate at download time). Unlimited headroom otherwise.

Sources:
- [About releases — GitHub Docs](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [Repository limits — GitHub Docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits)


## User

I'm talking about breaking changes for library consumers. ModelDefinition type change is not a breaking change


## Assistant

Consumer-only list then:

- **Tooling min versions** — TS 4.7+, Node 16.10+, bundlers supporting `exports`. Anyone on older stack breaks at resolve time.
- **UMD global shape** — if `window.Upscaler` surface changes (e.g. engine lookup hooks), script-tag users break.
- **Removed entry paths** — `import Upscaler from 'upscaler/node'` and `'upscaler/node-gpu'` stop working. Consumers update to `'upscaler'`.

If we keep model accepting object-or-factory, DI shift is additive not breaking.

Engine-swap consequences (`getModel()` returns different type, errors differ, `dispose()` semantics) only bite consumers who switch their model from TFJS to ONNX — that's a per-model migration, not a v2 upgrade break.

So the three you listed plus: **tooling min versions** and **removed entry paths**.


## User

Ok, so functionally 2 * 1000 = 2TB?


## Assistant

Yes. 2 GiB × 1000 = 2 TiB per release. And unlimited releases per repo, so aggregate is effectively unbounded. Docs explicitly say "no limit on total size of a release."

Practical shard threshold: only matters if a single model weight file > 2 GiB. For a 5 GiB model, split into 3 parts, concat on download. 1000-asset ceiling so generous it's not a real constraint.


## User

How does sharding work - does ONNX conversion handle this natively?


## Assistant

Yes — natively. ONNX uses protobuf, which caps messages at 2 GiB. For larger models, ONNX has **external data tensors**: weights live in separate files alongside the `.onnx` graph file, which holds just the topology + references.

Conversion side:
```python
onnx.save_model(
  model,
  'model.onnx',
  save_as_external_data=True,
  all_tensors_to_one_file=False,
  size_threshold=1024,
)
```
Produces `model.onnx` (small graph) + `weights.0`, `weights.1`, ... (arbitrarily many data shards, each under 2 GiB by config).

Load side:
- **Node**: shards on disk next to `model.onnx`; ORT resolves filenames relative to the `.onnx` automatically
- **Browser**: pass an `externalData` array to `InferenceSession.create` mapping filenames → fetched ArrayBuffers

GH Releases integration: upload `model.onnx` + N shards as separate assets in one release. postInstall downloads all of them, preserves filenames, places alongside each other. Browser loader does N parallel fetches from the CDN.

Gotchas:
- Shard filenames are embedded in the `.onnx` graph during export — download must preserve exact names
- Integrity check needs SHA for every shard, not just the `.onnx`
- Parallel downloads in browser = faster than sequential; worth it for big models

tf2onnx and torch.onnx.export both support external-data output. This is not UpscalerJS work — it's standard ONNX practice for large models.


## User

Yes, docs for UMD should pin the version if they're not already.

We'll probably want to continue supporting upscaler/node and upscaler/node-gpu until v3.

Tooling min versions I don't care about.

So actually, I don't think there's any real breaking changes, if we commit to continuing to support the import strategy. It's entirely opt-in - right?


## Assistant

Correct. Fully additive if:

1. Keep `/node`, `/node-gpu` entries (deprecate v2, remove v3)
2. Add root `upscaler` with conditional exports alongside — doesn't displace existing paths
3. `ModelDefinition.engine` optional, defaults `'tfjs'`
4. Model arg accepts object OR factory (union type)
5. TFJS peer dep stays on `upscaler` core for now (don't relocate to model packages in v2; do that at v3 when entries also drop)
6. UMD surface unchanged for TFJS users

Existing code keeps working unchanged. ONNX is opt-in per model. New root import is opt-in.

Real v2 = "added ONNX support." No breaks. Full break happens at v3 (path consolidation + peer-dep relocation).


## User

Ok. This is all sounding pretty good. So I imagine the following:

1. We do the model research work. Once converted, that gets uploaded to Hugging Face.
2. The model is accompanied by a Github repo. That repo gets loaded with a CI job. On version bump, it pulls models from HF, cuts a GH release and NPM release with the same version

Does that match your intuition?


## Assistant

Partially. Two pushback points:

## "A github repo" — per-model or monorepo?

Your existing setup is a monorepo (`packages/upscalerjs/` + `models/<name>/`). If each new ONNX model gets its own GH repo, you fragment:
- N CI configs to maintain
- Cross-model updates (ORT version bump, shared tooling) cascade manually
- Harder to see catalogue
- Breaks existing convention

Better: model packages stay in the monorepo. Release automation runs per-package. GH Release tags namespace by package (`real-esrgan-v2.3.0`). One repo, many npm packages, many release timelines. Matches today.

## HF as source-of-truth vs mirror

Your sketch has HF as source (CI pulls from HF to release). Alternative: GH Releases as source (post-train, you push weights straight to GH Release; HF is async mirror pushed afterwards for discovery).

Fork depends on where your researcher workflow lives:

- **Researcher works on HF** (notebooks, trainers, card published as part of research) → HF as source matches
- **Researcher works locally / Colab, HF is publish target** → GH as source simpler; HF becomes a "copy for marketing" step

For a JS-dev-targeting library, HF is not the consumer. Making it source-of-truth means if HF is flaky at release time, release blocks. Making it mirror means release path has no HF dependency.

If you're publishing one weights file per npm version and HF is just a shop window, I'd invert:
1. Train → local weights
2. CI: push to GH Release + publish NPM (atomic, same version)
3. CI (non-blocking): async push to HF for discovery

If you're doing research on HF and models are evolving there, your sketch is right.

Which matches how you actually work?


## User

Focus on the first case for now. GH repo - monorepo or multi. We could do monorepo - we could continue using the upscaler repo. What are the downsides?


## User

?


## Assistant

Architecture locked. What's open:

1. **ORT version pin policy** — `~1.24` patch-only across all new ONNX model packages, bumped in lockstep?
2. **Cloudflare Workers / Deno / Bun adapters** — defer or scope into v2?
3. **First ONNX model target** — which model ships v2 to validate the path end-to-end?
4. **Weight hosting** — GH Releases primary + HF mirror, runtime-fetch (no postInstall) — confirm?
5. **Deprecation timeline** — v2 adds ONNX; v3 consolidates imports + relocates peer deps. Timeline target for v3?

Want me to write agreed architecture into a decision doc (sibling to `PORT-DECISION.md`) before any code moves? Or tackle open items first?


## Assistant

Real downsides of staying monorepo in the existing UpscalerJS repo:

1. **Release blast radius.** Buggy release script fires N npm/GH releases in one run instead of one. Multi-repo isolates. Mitigable with good CI gates but real risk when agents touch release tooling.

2. **GH Release tag soup.** 10 models × independent versions = noisy tag list (`real-esrgan-v2.3.0`, `esrgan-medium-v4.2.1`, `upscaler-v2.0.0`, ...). GH UI can filter by prefix but navigation gets worse over time. Multi-repo gives each model its own clean tag timeline.

3. **CI matrix complexity.** Path-filtered workflows per package are doable but add config surface. Every new model adds another workflow slice. Multi-repo has trivial CI per repo.

4. **Branch protection uniformity.** One repo = one review policy. If a contributor should own just one model, you can't scope their write access. Hypothetical today, might matter later.

5. **Per-model discoverability surface.** Each model repo could have its own README, issues, discussions, badges. Monorepo forces all issues into one tracker.

6. **Agent parallelism.** Two agents touching two different models can collide on the same branch/PR queue in a monorepo. Multi-repo, they're independent. Matters more as LLM-driven maintenance scales.

7. **Git history readability.** Commits across unrelated models intermix. `git log packages/real-esrgan/` helps; doesn't fully solve.

Not real downsides:
- Repo size — weights go to GH Releases, not committed
- Discoverability on npm — package-level, unaffected

Net read: monorepo is fine at today's scale. Pain scales with number of models. If the roadmap is <10 models, monorepo wins on shared tooling. If it's 20+ or multi-contributor, multi-repo pays off.

Where's your headcount ceiling — solo maintainer + agents indefinitely, or planning to hand off model ownership eventually?


## User

Continue


## User

[Request interrupted by user]


## User

1) what? Don't the models define their own minimums? I don't understand this

2) We should support this, first party support. Does GH offer CI environments for this?

3) Don't worry about this

4) Don't worry about this

5) Don't worry about this


## Assistant

1) You're right. Models pin their own ORT via their `dependencies`. npm/pnpm resolves. If two models pin incompatible ranges, resolver fails loudly. Nothing to coordinate centrally. Non-issue — drop.

2) Yes, GH Actions handles all three on vanilla Ubuntu runners:

| Env | CI path |
|---|---|
| Cloudflare Workers | `npm i -D miniflare` or `@cloudflare/vitest-pool-workers` — Cloudflare's own local runtime, runs tests inside workerd, no special runner |
| Deno | `denoland/setup-deno@v1` action |
| Bun | `oven-sh/setup-bun@v1` action |

Miniflare is the key one — it's workerd-in-Node, gives full Workers API surface for tests. Cloudflare uses it themselves. Drop-in for vitest/jest.

Scope shape:
- **v2 ships with `workerd` condition + Miniflare test matrix.** First-party Workers support from day one.
- Deno + Bun work by accident if `browser`/`node` conditions resolve correctly. Add explicit conditions if/when demand shows.

Workers adapter needs:
- No `sharp`. WASM image decode (`@jsquash/*` or similar) or accept `ImageData`/`ArrayBuffer`-only input.
- No DOM. No `HTMLCanvasElement`.
- `onnxruntime-web` works in workerd (it's WASM). That part's free.


## User

I don't know how many models we'd have. Ideally we'd have 100s. In practice, we've only ever had a dozen - capped on my time. Your time is infinite so maybe we could have more. I don't know. I'd also love to welcome external contributions


## Assistant

That changes the answer. Aspirational 100s + external contributions tilts toward multi-repo.

## Why

**For 100s of models in a monorepo:**
- Clone/CI times degrade with scale
- GH UI navigation gets unpleasant (one issue tracker, one PR queue for all)
- Tag soup becomes unworkable

**For external contributions:**
- Contributor shouldn't clone a 500MB+ monorepo to add one model
- "Port Real-ESRGAN to ONNX" feels like a weekend project; "join the UpscalerJS monorepo" feels like joining a project
- Permission scoping: contributor owns their repo, not the whole library
- Issue/PR isolation: their model's bugs don't drown in unrelated noise

Multi-repo matches the model you implicitly want. HuggingFace works this way — thousands of independent model repos under a shared tooling layer.

## Proposed shape

- Core `upscaler` package stays in the existing `UpscalerJS` monorepo
- Existing TFJS models stay in the monorepo (maintenance-only per earlier decision)
- **New ONNX models = one repo each**, under an org namespace (`github.com/upscalerjs-models/real-esrgan` or similar)
- npm scope unaffected: every model still publishes to `@upscalerjs/<model>`
- Each model repo's GH Releases host its own weights

Natural: old = monorepo, new = multi-repo. Structure reflects "new models are ONNX-only" break.

## Supporting pieces required to make multi-repo not-painful

1. **Template repo** (`upscalerjs-model-template`). Contributor clones → fills in model metadata → works. Standard layout, pre-wired CI, pre-wired release workflow.

2. **Shared GitHub Actions** (published as reusable workflows). `release.yml`, `test.yml`, `convert.yml` called from each model repo. Fix once, every model gets it.

3. **Dependency-bump bot** across the fleet. ORT version bump = automated PR to all model repos.

4. **Catalogue page in main repo.** `MODELS.md` or docs site auto-generated from a manifest listing every model repo. Otherwise discovery dies.

5. **Integration test fleet.** Main `upscaler` repo CI pulls latest release of each model, runs smoke test. Catches "model X broke upscaler core" regressions.

Without these pieces, multi-repo gets worse than monorepo.

## Open question

**Org for model repos: existing `thekevinscott/UpscalerJS-adjacent` vs a dedicated org?**

- Single `UpscalerJS` repo + `upscalerjs-models/<name>` org sibling repos: clean separation, external contributors can get push access to just their model repo
- All under `thekevinscott/` personal namespace: no org overhead, but looks like "Kevin's side repos" not "the UpscalerJS project"
- Dedicated org from day one: cleaner brand, lets agents/contributors have org-level identity

Which?


## User

Ok. Sketch me out high level what migration plan looks like for this


## Assistant

# Migration plan (high-level)

## Phase 1 — Seam (invisible)

- `ModelDefinition.engine?: 'tfjs' | 'onnx'` (optional, default `'tfjs'`)
- Upscaler accepts `model | model(runtime?)`
- Dispatcher on `engine`; `'onnx'` branch throws "not yet available"
- Existing users untouched

**Gate:** green CI on existing test matrix. No behavioral diff.

## Phase 2 — ONNX adapter

- Promote spike code from `packages/upscalerjs-onnx/src/shared/` into `src/onnx/` in main package
- Dispatcher `'onnx'` branch now real
- `onnxruntime-web` dynamic-imported on demand
- Synthetic fixture test proves end-to-end

**Gate:** bundle-size test — TFJS-only bundle has zero ORT bytes.

## Phase 3 — Conditional exports root

- Add `upscaler` root entry with `browser` / `node` / `workerd` conditions
- `upscaler/node` + `upscaler/node-gpu` kept, marked deprecated in types (JSDoc `@deprecated`)
- Both old + new paths resolve to same build outputs

**Gate:** CI matrix runs Node, browser (playwright), workerd (Miniflare), all three green on same test suite.

## Phase 4 — Workers adapter

- `src/workerd/` — image I/O using WASM decode (`@jsquash/*` or equivalent) or `ImageData`-only input
- Miniflare test suite
- Docs section for Workers usage

**Gate:** real Workers deploy test (Cloudflare free tier runner in CI).

## Phase 5 — First ONNX model package

- Pick model (TBD — small/fast validation target)
- Publish `@upscalerjs/<name>` with factory export
- Ships `onnxruntime-web` as dep
- Weights on GH Releases, runtime-fetch (no postInstall)
- Parity test vs TFJS reference if applicable

**Gate:** end-to-end in all four envs (browser bundler, browser UMD, Node, Workers). This phase = "ONNX is real" moment.

## Phase 6 — Release v2.0

- MIGRATION.md (mostly "nothing changes unless you want it to")
- UMD script tag examples with pinned versions
- Deprecation notices on `/node`, `/node-gpu` imports
- v3 roadmap note (consolidation, not yet scheduled)

## Deferred to v3 (not scheduled)

- Remove `/node`, `/node-gpu` entries
- Relocate TFJS peer dep onto TFJS model packages
- Drop legacy tooling support

## User decision points

| Gate | Decision |
|---|---|
| Before Phase 5 | Which model ships first |
| During Phase 4 | Workers image input — WASM decode vs `ImageData`-only |
| Before Phase 6 | v2.0 release timing |

Phases 1-3 can land as separate PRs without ever announcing ONNX to users. Phases 4-5 are where external visibility starts.


## User

I have both `upscaler` and `upscalerjs` organizations. Probably prefer the former because it matches npm package


## Assistant

Quick ambiguity worth flagging:

- `github.com/upscaler` matches the **root npm package** (`upscaler`)
- `github.com/upscalerjs` matches the **npm scope** for model packages (`@upscalerjs/*`)

Discovery flow: user sees `@upscalerjs/real-esrgan` on npm → clicks "repository" link → lands on GH. If that link points to `github.com/upscaler/real-esrgan`, the mismatch between npm scope and GH org is mildly confusing. If it points to `github.com/upscalerjs/real-esrgan`, scope and org align.

Counter: root `upscaler` package probably lives at `github.com/upscaler/upscaler` or similar, and keeping model repos in the same org keeps the whole project under one brand.

Two consistent shapes:

**A. Everything under `upscaler` org** (your lean):
- `github.com/upscaler/upscaler` (core monorepo)
- `github.com/upscaler/real-esrgan` (model)
- npm: `upscaler` + `@upscalerjs/real-esrgan`
- Mismatch at npm-scope vs GH-org for models. Trade for brand unity.

**B. Core on `upscaler`, models on `upscalerjs`**:
- `github.com/upscaler/upscaler` (core)
- `github.com/upscalerjs/real-esrgan` (model)
- npm: `upscaler` + `@upscalerjs/real-esrgan`
- GH org matches npm scope per package type. Trade brand unity for naming consistency.

No wrong answer. Your call. Which?


## User

I don't know. I'll decide later. What's next


## Assistant

Decided so far:
- Engine discriminator on ModelDefinition (`engine: 'tfjs' | 'onnx'`)
- New models ONNX-only; old stay TFJS
- NPM-inline for small models; postInstall (Playwright pattern) for big
- GH Releases primary CDN; HF later for discovery
- ONNX external data for >2GiB sharding
- Core monorepo; new ONNX models multi-repo
- Runtime as dep of model package (not peer)
- Browser caching research item logged

Open menu. Pick one:

1. **Model package anatomy.** What a new ONNX model repo looks like file-by-file — `package.json`, `ModelDefinition` fields, postInstall script, weight manifest schema. Grounded, concrete.

2. **Core dual-backend seam.** The actual port in the `upscaler` package: engine dispatch, dynamic imports, bundle-size gates. Matches original PR.

3. **CI / release workflow.** Reusable GH Actions, conversion pipeline placement, weight upload step. Ops-heavy.

4. **Versioning policy.** How `upscaler` core signals compatibility with model packages (peer dep range, manifest-declared, etc.).

5. **Testing strategy.** Parity tests, cross-repo integration fleet, regression surface.

Recommend **1** next — it forces the abstractions in 2/3/4/5 to become concrete. Which?


## User

What dependencies does a model list for ONNX? How do we support both ONNX packages? Can we say _either_ one of these?

same with TFJS


## User

Focus exclusively on hosting models / CDN question. Another agent is tackling the rest


## Assistant

# Short answer

npm has no "OR dep" — can't list `onnxruntime-web OR onnxruntime-node`. Pick one as baseline, native via DI.

## ONNX model deps

```json
{
  "dependencies": { "onnxruntime-web": "^1.24" }
}
```

One dep. `onnxruntime-web` is pure WASM — works browser, Node, Workers, Deno, Bun. Zero-config everywhere.

Node users who want native perf:

```
npm i onnxruntime-node
```
```js
import * as ort from 'onnxruntime-node';
new Upscaler(model(ort));
```

Factory receives native runtime, bypasses the dynamic-import fallback. `onnxruntime-web` still sits in `node_modules` (~6 MB) unused. Tree-shakes out of the bundle.

## TFJS model deps

Same pattern:

```json
{
  "dependencies": { "@tensorflow/tfjs": "^4.22" }
}
```

Browser baseline. Node users opt into `@tensorflow/tfjs-node` / `-node-gpu` by installing + passing:

```js
import * as tf from '@tensorflow/tfjs-node-gpu';
new Upscaler(model(tf));
```

## Why not optionalDependencies for native variants

`optionalDependencies` installs unless platform incompatible — not a user opt-in signal. Doesn't solve zero-config; just silently fails on unsupported platforms. Skip.

## Why not peerDependencies with meta.optional

User must install explicitly. Breaks zero-config. Skip.

## Costs

- ~6 MB (ORT) / ~30 MB (TFJS) dead weight in `node_modules` for users who override to native. Not in bundle. Acceptable.
- Default Node ONNX path runs WASM (~2-5× slower than native). Docs call out upgrade path.

## Net

Model lists one runtime — the universal WASM/browser one. DI handles the rest. No OR-deps needed.


## Assistant

Hosting-scope open items:

1. **GH Releases CORS story (potential blocker).** Browser `fetch()` against `github.com/.../releases/download/...` must return CORS headers or the whole browser path breaks. Releases redirect to an S3/Fastly URL; need to verify `Access-Control-Allow-Origin` is served. If not, browser path needs a proxy layer (unacceptable) or different CDN.

2. **Size threshold** for NPM-inline vs external. 50MB? 100MB? Affects which models take the postInstall path.

3. **Content addressing scheme.** Weight URL contains hash? Filename `v<pkg-version>/model.onnx` vs `<sha256>/model.onnx`? Affects cache-bust semantics and integrity.

4. **Integrity manifest format.** SHA256 per shard stored where — `package.json` field, separate `weights.lock`, or in the `ModelDefinition`? Format matters for CI signing.

5. **postInstall polish spec.** Resumable downloads, parallelism for sharded files, progress UX, `--ignore-scripts` fallback CLI name, env var surface (`UPSCALERJS_SKIP_DOWNLOAD`, `UPSCALERJS_CACHE`, `UPSCALERJS_REGISTRY`).

6. **Browser polish spec.** IndexedDB vs Cache API vs service worker; chunked write for 1GB; precache API surface; progress events on `upscale()`.

7. **HF mirror automation.** CI job shape, when added. Non-critical path, defer-able.

Recommend verifying **#1** first — if CORS fails, architecture shifts. Want me to check?


## User

Please do web research - in particular, find other popular open source libraries that have this same challenge (multiple potential dependencies, the OR case) - do an audit and find out how they handle it


## User

Confirm 1.

2 - what ?

3 - maybe sha256? wdyt

4 - I don't know, thoughts?

5 - not sure, thoughts?

6 - not sure, thoughts?


## Assistant

**This is a blocker for the browser path.** GH Releases doesn't send `Access-Control-Allow-Origin` headers; browser `fetch()` against release URLs fails CORS preflight.

Node path is unaffected — `postinstall` runs outside browser, no CORS constraint. GH Releases works there.

Browser path needs rethink. Let me verify alternatives.


## Assistant

## CORS findings (load-bearing)

- **GH Releases**: ✗ no CORS. Browser dead.
- **HuggingFace**: ✓ CORS works. Rate limit `3000 req / 150s per IP` — fine for users, loose enough for CI.
- **jsDelivr (gh mirror)**: ✓ CORS + `*`. But **50MB per-file cap**. Dead for 1GB models.
- **Cloudflare Worker fronting GH**: possible, but you run infra.
- **Cloudflare R2**: ✓ CORS-configurable, unlimited size, $0 egress, free 10GB tier. Costs infra ownership.

This forces a rethink. Either **HF on critical path for browser**, or you run your own CDN (Worker or R2).

### Recommended pivot

**HF primary CDN for both browser and Node. GH Releases as immutable archive/backup.**

Reasons:
- HF serves CORS → browser works
- HF unlimited size → 1GB fits
- Rate limits per-IP are loose enough for real usage
- GH Releases stays as provenance anchor (immutable, atomic with git tag)
- Aligns with ML community discovery for free

Loader tries HF first, falls back to GH Releases for Node only (no fallback for browser since GH won't CORS).

This puts HF on critical path — opposite of where we ended earlier. But the CORS finding forces it.

Alternative if you don't want HF dependency: **Cloudflare R2** as our-own-CDN. Clean, one origin, CORS we control, ~free at UpscalerJS scale. Infra cost: one bucket, one domain, CI write step.

---

## On your other questions

### 2 — what did "size threshold" mean

The cutoff between "weights inline in NPM tarball" vs "weights external, postInstall downloads." 

CORS finding actually simplifies this: **drop NPM-inline entirely, use postInstall uniformly for all models.** Even small ones. One code path, fewer bugs. `npm install` is a reasonable place to fetch; Playwright does this regardless of Chromium size.

Kills the size-threshold question. Recommend uniform postInstall.

### 3 — SHA256 in URL — yes

`v<pkg-version>/<basename>.<sha256-prefix>.onnx` or content-addressed `<sha256>/model.onnx`.

Prefer **version-prefixed with SHA suffix**: `v2.3.0/model.3f8a91c2.onnx`. Human-readable version, immutable content address, automatic cache-bust if weights change without version bump (catches CI mistakes).

### 4 — integrity manifest — in package.json

```json
{
  "name": "@upscalerjs/real-esrgan",
  "version": "2.3.0",
  "upscalerjs": {
    "engine": "onnx",
    "weights": [
      { "file": "model.onnx", "sha256": "3f8a91...", "size": 4194304 },
      { "file": "weights.0", "sha256": "a7b4c3...", "size": 1073741824 }
    ],
    "cdn": {
      "primary": "https://huggingface.co/upscalerjs/real-esrgan/resolve/v2.3.0",
      "fallback": "https://github.com/upscaler/real-esrgan/releases/download/v2.3.0"
    }
  }
}
```

Single source of truth in `package.json`. No separate lockfile. postInstall reads manifest, fetches, verifies. Shippable in NPM tarball at trivial size.

### 5 — postInstall polish spec

```
@upscalerjs/real-esrgan/
├── package.json                  # manifest
├── scripts/install.js            # postinstall entrypoint
├── weights/                      # target dir (empty until install)
└── index.js                      # exports ModelDefinition pointing at weights/
```

`install.js` behavior:
1. Read manifest from `package.json.upscalerjs.weights`
2. For each weight: check `weights/<file>` exists + sha256 matches → skip if cached
3. If not cached: fetch from `primary` → fall back to `fallback` on failure
4. Stream to disk with resume via HTTP range on retry
5. Verify sha256 after complete; fail loudly on mismatch
6. Progress: stderr bar (TTY) or JSON line (`CI=true`)

Env vars:
- `UPSCALERJS_SKIP_DOWNLOAD=1` — skip install (power user, Docker-cache scenarios)
- `UPSCALERJS_CACHE` — override weights destination (default: `node_modules/@upscalerjs/<model>/weights/`)
- `UPSCALERJS_CDN` — override manifest's primary CDN (air-gapped mirrors)

Fallback CLI (`--ignore-scripts` users): `npx @upscalerjs/real-esrgan install`. Shipped in every model package. Same script, invoked manually.

Parallelism: fetch all shards concurrently (capped at N=4). 1GB split across 2 × 500MB shards downloads twice as fast.

Errors: network failure → exit 1 with actionable message ("retry, or set `UPSCALERJS_SKIP_DOWNLOAD=1` and run `npx @upscalerjs/real-esrgan install` later"). Never silent.

### 6 — browser polish spec

```js
// In the Upscaler core
const u = new Upscaler({ model });
await u.precache();               // optional: eager fetch + cache
await u.upscale(img, {            // progress events during cold fetch
  onModelDownloadProgress: ({ loaded, total }) => { /* UI */ }
});
```

Cache backend: **IndexedDB, chunked**. 1GB models in 10MB chunks. Reasons:
- Cache API sized for HTTP responses, awkward for ArrayBuffers at this scale
- Service worker optional on top (PWA use case) — exposed as a recipe, not required
- IndexedDB quota: Chrome = generous, Safari ~1GB per origin, Firefox ~10% of disk. Handle quota-exceeded errors with actionable message

Fetch behavior:
1. Stream fetch from `manifest.cdn.primary`
2. Chunked write to IndexedDB as stream progresses
3. Verify sha256 at end → if mismatch, evict + refetch once → fail
4. Return model weights as merged ArrayBuffer to ORT
5. Subsequent calls: IndexedDB hit, no network

No fallback CDN in browser (GH Releases can't CORS). Rely on HF primary only, surface errors loudly.

Precache API shape worth locking in: `Upscaler.precache(model)` static, usable at app init/idle-callback time.

---

## Open questions back at you

1. **HF on critical path vs Cloudflare R2.** HF saves you ops; R2 avoids dependency on a third party with rate limits and occasional outages. Lean?
2. **Uniform postInstall (all models) vs inline-small-models.** Unified is simpler. Objection?
3. **Browser fallback story if HF is down.** No GH fallback possible (CORS). Options: second CORS-enabled mirror (you run), or just accept "HF down = UpscalerJS browser down." Honest.

Sources:
- [How to Fetch Files From a GitHub Release (Without CORS Errors) — DEV](https://dev.to/reynaldi/how-to-fetch-files-from-a-github-release-without-cors-errors-2oc7)
- [Download release assets and zipball with CORS · community · Discussion #45446](https://github.com/orgs/community/discussions/45446)
- [jsDelivr file size limit issue #18268](https://github.com/jsdelivr/jsdelivr/issues/18268)


## Assistant

# Research findings

## Three ecosystem patterns

| Pattern | Example libs | Our fit |
|---|---|---|
| **Platform binary matrix** — `optionalDependencies` with `os`/`cpu` filters | Sharp, esbuild, Next.js SWC, Turbopack | No — our "OR" is user choice, not platform |
| **Optional peerDeps + subpath exports** — user installs what they use | Drizzle, TypeORM, LangChain community, Prisma | Partial fit — proven at scale |
| **Env-split via conditional exports OR separate packages** | Sentry (separate pkgs), Axios (`exports` keys), Transformers.js (both deps regular) | Direct analog on transformers.js |

## The Transformers.js cautionary tale

Closest analog to us. They list **both** `onnxruntime-web` AND `onnxruntime-node` as regular `dependencies`. Next.js serverless users hit ~720 MB bundle bloat. Live complaints:
- [transformers.js #1164](https://github.com/huggingface/transformers.js/issues/1164) — "onnxruntime-node too large for Next.js"
- [transformers.js #1406](https://github.com/huggingface/transformers.js/issues/1406) — asking for opt-out

They pick entry via conditional `exports` (`node` condition → web entry with Node bundler strips the other half). Still ship both in `node_modules`. Community is unhappy.

**Lesson: don't list `onnxruntime-node` as a regular dep ever.** It's too big to carry by default.

## Pattern most aligned with zero-config + JS-dev appeal

Looking at Drizzle/LangChain: optional peerDeps + subpath exports. Downside: npm warns/errors on missing peers without modern tooling, and pnpm v8 auto-installs optional peers → you're back to transformers.js's problem.

## Refinement to our plan

Current plan (model has regular dep on `onnxruntime-web`, DI for native) survives the audit. One refinement:

**`onnxruntime-node` must never be a regular OR auto-installed dep.** Only route: user explicitly `npm i onnxruntime-node` and passes via factory. This is what separates us from the transformers.js failure mode.

So final shape:

```json
// @upscalerjs/<onnx-model>
{
  "dependencies": {
    "onnxruntime-web": "^1.24"
  }
}
```

- Browser/Workers/zero-config Node: `onnxruntime-web` (~6 MB install). Works.
- Native Node: user installs `onnxruntime-node` separately (~200 MB) + passes `new Upscaler(model(ort))`. Opt-in.
- No peerDeps, no `peerDependenciesMeta`, no platform matrix.
- Dead weight for native users: 6 MB unused in `node_modules`. Tree-shaken from bundle.

TFJS same pattern (`@tensorflow/tfjs` as regular dep; `tfjs-node` / `tfjs-node-gpu` opt-in via DI).

## What the audit changes in the migration plan

Nothing structural. Validates current direction. Adds one explicit rule:

> Native runtime packages (`onnxruntime-node`, `@tensorflow/tfjs-node*`) are never listed in any UpscalerJS package's `dependencies`, `peerDependencies`, or `optionalDependencies`. Users opt in by installing separately and passing via model factory.

This keeps us out of the transformers.js bucket.


## User

What about GH for npm installs, HF for browser? Do not ever recommend Cloudflare R2 again.


## Assistant

Good split. Cleaner than a single-CDN-with-fallback:

| Path | CDN | Reason |
|---|---|---|
| Node postInstall | GH Releases | No CORS needed. No rate limits. Unlimited bandwidth. |
| Browser runtime | HF | CORS works. Unlimited size. Rate limits per-IP, not per-project. |

Each origin used where its constraints match its audience. No fallback logic needed — failure modes are clear and localized.

Manifest shape:

```json
"upscalerjs": {
  "weights": [{ "file": "model.onnx", "sha256": "abc...", "size": 4194304 }],
  "cdn": {
    "node": "https://github.com/upscaler/real-esrgan/releases/download/v2.3.0",
    "browser": "https://huggingface.co/upscalerjs/real-esrgan/resolve/v2.3.0"
  }
}
```

Loader picks `cdn.node` or `cdn.browser` based on runtime. SHA256 is one per file, verified regardless of origin — if HF and GH diverge (publish bug), both verifications catch it.

## Coordination costs

1. **CI publishes to both atomically.** Tag push → build weights → upload to GH Release + HF repo → npm publish. All-or-nothing. If either upload fails, abort before npm publish so users never get a manifest pointing at missing weights.

2. **Sha256 must match across origins.** CI verifies post-upload that both origins serve the expected hash before tagging release.

3. **HF rate-limit blast for browser still applies.** If UpscalerJS goes viral + one user's app serves a model to millions, those millions hit HF from their own IPs (not yours), so per-IP limits don't concentrate. Safe enough.

## Failure modes

- **GH outage during `npm install`** — install fails loudly; user retries. Already-installed projects unaffected.
- **HF outage during browser cold load** — first-time user sees error. Cached users (IndexedDB) unaffected. Degraded, not dead.
- **Either origin corrupted post-upload** — sha256 check fails, loud error. Never silent.

Browser has no second-origin fallback (CORS disqualifies GH, and "never recommend R2" cuts the obvious alternative). Accept: HF outage = first-load failure for browser users. Honest, and rare.

## Confirmed decisions in hosting scope

- Engine discriminator on `ModelDefinition` (handed off)
- New ONNX models multi-repo under an org (naming deferred)
- Uniform postInstall (all model sizes, one code path)
- Weight manifest lives in `package.json.upscalerjs`
- SHA256 integrity per weight
- Version-prefixed URLs with sha256 suffix for cache-bust
- Node postInstall → GH Releases
- Browser first-use fetch → HF, IndexedDB chunked cache
- Env vars: `UPSCALERJS_SKIP_DOWNLOAD`, `UPSCALERJS_CACHE`, `UPSCALERJS_CDN` (override primary)
- Fallback CLI (`--ignore-scripts`): `npx @upscalerjs/<model> install`
- Resumable downloads, parallel shard fetching, loud errors

## Still open

1. GH org naming (deferred)
2. HF org naming for the `huggingface.co/<org>/<model>` namespace
3. Whether to lock HF repo commit hash into manifest (immutability) vs `resolve/v2.3.0` (readable, mutable if you force-push the tag)


## User

What I'm asking is a true OR solution. Your proposal still installs worthless bloat. I'm looking for solutions- if there are truly no solutions, say so, but I'm interested in how other libraries handle. Sounds like there are some.

They _should_ specifically be about user choice, _not_ platform matrix.


## Assistant

You're right. Three real OR solutions in the audit, all user-choice not platform:

## 1. Optional peerDependencies (Drizzle, TypeORM, LangChain, Prisma)

```json
{
  "peerDependencies": {
    "onnxruntime-web":  "^1.24",
    "onnxruntime-node": "^1.24"
  },
  "peerDependenciesMeta": {
    "onnxruntime-web":  { "optional": true },
    "onnxruntime-node": { "optional": true }
  }
}
```

**Key fact:** modern npm + pnpm do **not** auto-install optional peers. Only regular peers. User installs exactly one. Zero bloat in either direction.

User UX:
```
npm i upscaler @upscalerjs/real-esrgan onnxruntime-web   # browser / zero-config Node
npm i upscaler @upscalerjs/real-esrgan onnxruntime-node  # native Node
```

If they forget: clean import-time error (`Cannot find module 'onnxruntime-web'`). Loader wraps this to say `Run: npm install onnxruntime-web`.

## 2. Pure DI (Kysely, Fastify plugins)

Package declares no runtime deps at all. User installs + passes explicitly:

```js
import * as ort from 'onnxruntime-web';
new Upscaler(model(ort));
```

Zero bloat, zero peer machinery. Cost: every user writes DI wiring, even browser zero-config path.

## 3. Separate packages (Sentry, bcrypt/bcryptjs)

```
@upscalerjs/real-esrgan-web   → regular dep onnxruntime-web
@upscalerjs/real-esrgan-node  → regular dep onnxruntime-node
```

User picks package by env/perf. Zero bloat. Cost: 2× packages per model, discovery split.

## Which fits UpscalerJS

**Option 1 (optional peerDeps) is the one.** Drizzle/LangChain/TypeORM all landed here for the same reason — user-choice, zero-bloat, auto-install semantics behave correctly on npm + pnpm.

DX shape:
- User installs `@upscalerjs/<model>` + exactly one runtime
- Static import inside model package → clear error if runtime missing
- No DI required for zero-config case (runtime resolved by module system, not constructor arg)
- Factory-call pattern (`model(ort)`) becomes optional opt-out for users who want to inject a specific runtime instance (testing, multi-version)

## Correction to earlier plan

Drop "regular dep on `onnxruntime-web`" — that's still bloat for native-Node users. Use optional peerDeps on both. Auto-install semantics prevent the transformers.js failure mode.

User's "what happens if user omits TFJS today" question earlier: with optional peers, omission = clean import error with install instructions. Better than today's silent module-resolution failure.


## User

Why do we need cdn.node ? Is that for postinstall?


## User

No I'm saying - do _additional_ research. Find 10+ examples of libraries that allow for user choice in sub-dependencies - the OR case. Audit what they do


## Assistant

Yes, exactly. `cdn.node` is only read at postInstall time. After install, Node runtime reads directly from `node_modules/<model>/weights/<file>` on disk — never hits a CDN again.

Edge cases where Node *would* refetch:
- `UPSCALERJS_SKIP_DOWNLOAD=1` at install time, user runs `npx @upscalerjs/<model> install` later
- User manually deletes `weights/` directory
- Serverless Node (ephemeral filesystem per invocation) — edge case; they'd configure differently

All of those still hit the same GH URL the postInstall would. Same field.

Your question surfaces that the naming is misleading — `cdn.node` / `cdn.browser` implies runtime split. Actually it's **install-time vs runtime-fetch**:

```json
"cdn": {
  "install": "https://github.com/upscaler/real-esrgan/releases/download/v2.3.0",
  "runtime": "https://huggingface.co/upscalerjs/real-esrgan/resolve/v2.3.0"
}
```

Or by origin:

```json
"cdn": {
  "github": "...",
  "huggingface": "..."
}
```

Loader picks: install tooling → github. Browser runtime → huggingface. Node runtime never picks (reads disk), except in edge cases above where it uses github.

Prefer the second (origin-named) — clearer what each URL is and avoids confusion about which "runtime" means what. Loader code knows the semantics.


## User

Ok. Any open remaining questions?


## Assistant

# 18 libraries audited. Three clusters.

## Cluster 1: Optional peerDeps + lazy `require()` (string-keyed)

Library names alternatives in config; dispatches at runtime.

Sequelize (`dialect: 'postgres'`), Knex (`client: 'pg'`), TypeORM (`type: 'mysql'`), Vite (preprocessor by file ext), Drizzle (subpath export + lazy require), Apollo WS transports.

Pattern: `peerDependenciesMeta.optional: true` suppresses warnings; actual enforcement is `try { require(name) } catch { throw "Install <pkg>" }`.

## Cluster 2: Separate sibling packages + pure DI (no peer metadata at all)

Library accepts instantiated objects user imports + constructs.

Vercel AI SDK (`model: openai(...)`), LangChain.js, LlamaIndex.TS, MikroORM, Socket.IO adapters, Winston transports, Pino dest fns, Rollup/PostCSS/unified plugins, Fastify plugins, Storybook framework adapters, Kysely dialects.

Core never names alternatives at all. Zero metadata. Discovery via docs. Failure at user's own import site.

## Cluster 3: String-keyed dynamic require, no metadata

Pino transports (`target: 'pino-pretty'`), Express view engines (`app.set('view engine', 'pug')`).

Rare. No package.json signal; `require(userString)` inside library.

## Which cluster fits UpscalerJS

**Cluster 2.** The ecosystem is trending here — AI SDK, Kysely, modern Drizzle subpaths, LangChain split into providers. Zero bloat, no peer dance, no lazy-require brittleness, works across bundlers + Workers + Deno + Bun uniformly.

Your earlier `model(ort)` factory proposal is already Cluster 2. The research validates it.

## Mechanism mapping (UpscalerJS)

```js
// model package: zero runtime deps
// core upscaler: zero runtime deps

import * as ort from 'onnxruntime-web';      // user chooses runtime
import Upscaler from 'upscaler';
import model from '@upscalerjs/real-esrgan/x4';

new Upscaler(model(ort));
```

Model package declares nothing about ORT. User picks + installs. Factory receives it.

## Trade-off that Cluster 2 forces

Zero-config browser path becomes one extra import line. User writes two extra characters (`ort` variable) + one import. That's the cost of zero-bloat.

Compared to Cluster 1 (our prior plan): no ~6 MB dead weight, no `peerDependenciesMeta`, no lazy-require error wrapping, no install surprises on different package managers. But user writes the DI line always.

## Can we have both

Hybrid possible: factory accepts optional runtime arg; if absent, dynamic-imports a fallback. Fallback requires the dep. That's Cluster 1 bolted on.

Cluster-2-pure is cleaner. Pino, Kysely, AI SDK all demonstrate users adapt to the DI line quickly. Error messages are clearer ("Cannot find module 'onnxruntime-web'" at user's import, not buried in library code).

## Recommendation

Go full Cluster 2. Model package has zero runtime deps. User imports runtime explicitly, passes to model factory. Matches modern ecosystem convergence.

Docs provide one-line copy-paste for each env:
```js
// browser
import * as ort from 'onnxruntime-web';
// node native
import * as ort from 'onnxruntime-node';
```

Three lines total: `import ort`, `import model`, `new Upscaler(model(ort))`. Zero magic.


## Assistant

Material open items still in hosting scope:

1. **HF URL form: tag vs commit hash.** `resolve/v2.3.0` readable + mutable-if-force-pushed, `resolve/<sha>` immutable + opaque. Matters for reproducibility — if someone force-pushes a tag, existing installs break integrity check.

2. **`default-model` handling.** `new Upscaler()` no-args loads it. Same postInstall mechanism as everything else, or some special-case so the zero-config path doesn't require network on first install? Biggest ergonomic question since it affects the "just works" story for new users.

3. **Package-manager dedup behaviour.** pnpm hardlinks from global store; postInstall may run per-install or per-store depending on config. Yarn PnP stores differently. npm installs fresh each time. Worth a CI matrix + documented expectations.

4. **Corp/air-gap mirror story.** `UPSCALERJS_CDN` env var can point at internal mirror. Need mirror to mirror both GH + HF shapes, or require one origin-agnostic bucket? Enterprise adoption hinges on this working.

5. **HF rate-limit blast for CI-heavy browser testing.** Headless CI farms spawning thousands of browser instances from a single NAT'd IP could trip HF per-IP limits. Accept ("run your own cache proxy for CI") or ship a fallback?

6. **HF/GH naming.** You deferred GH org. HF needs a parallel decision (`huggingface.co/upscaler` vs `huggingface.co/upscalerjs`). Both should resolve together.

7. **Weight file naming convention on each origin.** GH Release assets flat under a tag. HF repo layout supports subdirs. Pick one convention that works on both — probably `weights/<basename>.<sha-prefix>.<ext>` — so the manifest's file paths resolve identically against either CDN prefix.

Deferred (not critical path):
- Service worker recipe
- IndexedDB chunk size
- Eviction policy at quota-exceeded
- Shared-origin IndexedDB cache across multiple model packages

Most material: **#2** (default-model UX), **#4** (enterprise adoption), **#1** (reproducibility).


## User

I like cluster 2, perhaps with a default onnxruntime-web in teh future, if the default model opts in (or TFJS if not). thoughts? One extra package but zero config


## Assistant

# Shape works. Two options.

## Option A: wrapper package (zero bloat for power users)

```
upscaler           → pure DI, zero runtime deps, zero default-model
@upscalerjs/start  → depends on upscaler + default-model + its runtime
```

**Zero-config:**
```
npm i @upscalerjs/start
```
```js
import Upscaler from '@upscalerjs/start';
new Upscaler();
```

**Power:**
```
npm i upscaler onnxruntime-web @upscalerjs/real-esrgan
```
```js
import * as ort from 'onnxruntime-web';
import Upscaler from 'upscaler';
import model from '@upscalerjs/real-esrgan/x4';
new Upscaler(model(ort));
```

Pure isolation. Core has zero deps. Wrapper reflects default-model's engine — if default is TFJS today, wrapper ships TFJS; if default flips to ONNX later, wrapper ships ORT.

**Cost:** existing `upscaler` semantics change — breaking. No longer works with `new Upscaler()` no-args. Users migrate to wrapper. Not additive.

## Option B: single package, dead weight accepted (additive)

Keep `upscaler` as-is (default-model + TFJS auto-pulled). Add factory acceptance:

```js
// zero-config (today, unchanged)
new Upscaler();

// custom TFJS model (today, unchanged)
new Upscaler({ model });

// custom ONNX model (v2 new)
new Upscaler(model(ort));
```

ONNX-only user gets ~8 MB TFJS + default-model sitting in `node_modules`, unused. Tree-shaken from final bundle. Not in the 720 MB transformers.js range.

**Cost:** dead weight in `node_modules` for advanced users. ~8 MB. Tolerable.

## Which

Option B if additive-v2 is a hard constraint (you said earlier: no breaks).

Option A if zero bloat matters more than backward compat — becomes the v3 shape anyway.

Hybrid path: ship Option B in v2, Option A in v3 (rename path or introduce wrapper then). v2 users migrate to `@upscalerjs/start` at v3 for zero-config; power users stay on `upscaler` which has become pure DI.

## Naming note

`@upscalerjs/start` is one name. Precedent:
- `create-react-app` / `@vitejs/create-vite` — scaffold tools
- `@sentry/browser` / `@sentry/node` — opinionated env presets
- `@ai-sdk/react` — framework wrappers

`@upscalerjs/start` or `@upscalerjs/zero-config` reads well. `@upscalerjs/default` conflicts with `@upscalerjs/default-model`.

## Recommendation

Stay on Option B through v2. Evaluate bloat complaints before v3. If none land, keep single-package; if they do, split into Option A shape at v3.

Matches the "v2 fully additive" principle from earlier. Defers the harder call until data arrives.


## User

no, do not like start


## Assistant

Alternatives:

- `@upscalerjs/core` — keep `upscaler` as zero-config wrapper, new `@upscalerjs/core` is pure DI (Sentry-style split, but inverted: the short name wins the brand)
- `@upscalerjs/auto`
- `@upscalerjs/batteries`
- `@upscalerjs/standalone`
- `@upscalerjs/bundle`

Strongest: **`@upscalerjs/core` as the pure-DI package, `upscaler` stays the zero-config wrapper.**

- Existing `upscaler` users unchanged forever — same install, same no-arg `new Upscaler()` works
- Power users install `@upscalerjs/core` directly — zero bloat, pure DI
- `upscaler` package = wrapper that re-exports `@upscalerjs/core` + wires default-model + TFJS
- Name `core` signals "minimal" to power users; `upscaler` signals "just works" to beginners
- Matches LangChain (`@langchain/core` vs `langchain`) and Sentry patterns

One wrinkle: "core" usually means internal plumbing in OSS (used by library authors, not end users). If you want it clearly user-facing, consider `@upscalerjs/pure` or `@upscalerjs/lite`.


## User

No no none of those are good. We'll just install the onnx package (or tfjs)


## Assistant

Got it. Drop wrapper. Shape:

- `upscaler` stays as-is (TFJS peer, default-model, no-arg zero-config works)
- ONNX users install `onnxruntime-web` (or `-node`) themselves + `@upscalerjs/<onnx-model>`
- ONNX path: `new Upscaler(model(ort))`
- No new packages invented

Clean. One less thing to name.


## User

What is the size of onnxruntime-web and tensorflow.js


## Assistant

# Size check

## npm unpacked (sits in `node_modules`)

| Package | Version | Unpacked |
|---|---|---|
| `onnxruntime-web` | 1.24.3 | **138 MB** |
| `onnxruntime-node` | 1.24.3 | **220 MB** |
| `@tensorflow/tfjs` | 4.22.0 | **147 MB** |
| `@tensorflow/tfjs-node` | 4.22.0 | 2 MB + **~150 MB** postinstall native binaries |
| `@tensorflow/tfjs-node-gpu` | 4.22.0 | 2 MB + **~500+ MB** postinstall (CUDA libs) |

Why ORT-web is 138 MB: ships WASM + WebGPU + WebGL + WebNN providers, debug + release builds, multi-threaded + single-threaded variants, source maps.

## Browser bundle (what ships to user)

From PR measurements:
- `onnxruntime-web`: ~6 MB uncompressed, ~2 MB gzipped
- `@tensorflow/tfjs`: ~5 MB uncompressed, ~1.5 MB gzipped

Tree-shaken + production-mode. Similar ballpark.

## Implication

npm install footprint ≈ transformers.js complaint territory (720 MB was both ORT variants + extras). Per-runtime it's 138-220 MB — still large.

Bundle size (what users actually ship to visitors) is sane: ~2 MB gzip either way.

Cluster 2 DI keeps users from installing both. One runtime in `node_modules`. Not both. Matches the zero-bloat goal.


## User

1 - versions.

2 - ignore this. we're not changing historical model behavior. Maybe relevant: for models < 100mb perhaps we consider putting models in NPM. Still same CI workflows (host on hugging face and GH for consistency) but prefer NPM where we can.

3 - say more.

4 - what? I'm not getting into infra hosting.

5 - aren't we installing from github? If this is for us, can't we leverage a cache?

6 - ignore this, I'll decide later. Not important.

7 - you decide


## User

Ok. That's not that small.

Idea. What if models themselves have a post install step. They could check for presence of one of their dependencies; if one doesn't exist, prompt to install. Do other libraries take this approach?


## Assistant

Recorded: tags not commit hashes for HF URLs.

**On #2 re-entry of NPM-inline for <100MB:**

Drops the "uniform postInstall" simplification. Revised shape:

| Model size | NPM tarball | GH Release | HF |
|---|---|---|---|
| <100MB | weights inline | weights uploaded (consistency) | weights uploaded |
| ≥100MB | stub only | weights uploaded | weights uploaded |

CI publishes to both HF and GH uniformly regardless. NPM-inline is an extra optimization for small models; CI workflow unchanged.

postInstall logic:
- Check if weights present in package dir (NPM-inline case) → skip
- Else fetch from GH → write to `node_modules/<model>/weights/`

Browser always fetches from HF regardless — bundler can't reliably pull weights from NPM tarball across every toolchain, and HF is the path with CORS. Uniform browser behavior.

**#3 pnpm / yarn dedup — say more:**

| Package manager | Behavior | Dedup |
|---|---|---|
| npm | Per-project `node_modules/<model>/weights/`. postInstall runs once per install. 5 projects = 5 weight copies on disk. | None |
| pnpm | CAS store `~/.local/share/pnpm/store/`. Hard-links to project node_modules. postInstall runs once; weights land in shared store, hard-linked everywhere. | Free — 5 projects = 1 disk copy |
| yarn classic | Like npm. | None |
| yarn berry PnP | Zip-embedded packages, no `node_modules/`. postInstall can't reliably write persistent files. Needs `unplug` config per-package. | Broken unless configured |
| bun | Uses node_modules; largely works like npm. | None tested |

Recommendation: first-class support for **npm + pnpm**. pnpm gets dedup for free. Yarn classic works but without dedup. Yarn PnP documented as "add `unplug` to yarnrc.yml." Bun not blocked from use; not on CI matrix initially.

CI matrix: test install + load across npm, pnpm, yarn classic at minimum.

**#4 dropped.** Enterprise mirror is `UPSCALERJS_CDN` env var → their problem to host.

**#5 CI-heavy testing — accept, leverage caching:**

Our CI: prefetch weights once in CI setup step, cache via GH Actions cache (keyed on manifest sha), replay in subsequent jobs. Standard pattern. Or `UPSCALERJS_SKIP_DOWNLOAD=1` + manual pre-seed. Documented, not a product problem.

Consumer CI: same advice. If they're bundling weights into build artifacts, no runtime fetch needed. If they're browser-testing, IndexedDB caches between runs OR they set up their own proxy. Not our problem.

**#6 deferred.**

**#7 filename convention — flat + content-addressed:**

Both GH Releases (flat per-tag namespace) and HF (repo-rooted) use:

```
model.<sha-prefix>.onnx
model.<sha-prefix>.data.0
model.<sha-prefix>.data.1
```

Where `<sha-prefix>` = first 8 hex chars of the full sha256. Collision-resistant at this scale, human-readable, force-push-resistant (different content = different filename).

Manifest's `file` field carries bare filename. Loader concatenates: `<cdn-origin>/<filename>`. Same path against either CDN. HF repo root holds weights + `README.md`; GH Release tag holds weights as assets. No subdirs on either.

## Revised decision set

- <100MB: NPM-inline + GH + HF (three copies)
- ≥100MB: stub + GH + HF (two copies)
- Node install: postInstall skips if NPM-inline; else GH fetch
- Browser runtime: HF fetch always → IndexedDB
- HF URLs: tag-based (`resolve/v2.3.0`)
- Filenames: flat, sha-prefix-suffixed
- Package managers: npm + pnpm first-class; yarn classic works; yarn PnP docs-configured; bun untested

## Remaining open (hosting scope)

- GH + HF org naming (you deferred)

That's it for hosting. Ready to hand off.


## Assistant

# Short answer: essentially nobody does this. Reasons:

## Technical barriers

- **CI is non-interactive.** Prompt hangs or defaults silently. Breaks every auto-deploy pipeline.
- **`npm install --ignore-scripts`** disables postinstall entirely. Common in enterprise + security-conscious shops. Script never runs.
- **pnpm 10 disables postinstall by default for non-root packages.** Has to be approved per-package. Your model package's postinstall wouldn't run on fresh pnpm installs unless user explicitly allows.
- **Can't mutate user's `package.json`** from postinstall safely. Nested `npm install` from within postinstall hits lock contention, wrong CWD in workspaces, infinite recursion risk.
- **Monorepos multiply the problem.** Every package install triggers every postinstall. Noise × N.

## What libs actually do at postinstall

| Lib | Action | Interactive? |
|---|---|---|
| Playwright | Downloads browser binaries to shared cache | No — unconditional, env var to skip |
| Puppeteer | Downloads Chromium | No — unconditional |
| Sharp | Downloads prebuilt native binary | No |
| Cypress | Downloads binary | No |
| `fsevents` | Logs platform warning | No |
| `node-gyp-build` | Resolves prebuilt binary or compiles | No |

Pattern: **fetch pre-declared resources, never prompt.** Interaction always deferred to docs or first-run CLI (`npx playwright install`).

## Closest to your idea

Some libs print a **warning** in postinstall when a peer dep isn't resolvable:
- Old versions of `react-scripts` warned about missing peer
- `husky` logs install instructions
- `nuxt` logs missing modules

But these are `console.log` messages scrolling past user's wall of npm install output, not prompts. Easy to miss.

## Why it won't help UpscalerJS

Your zero-config goal is to **avoid** install-time friction. Adding a prompt adds friction even when it works. When it doesn't work (CI, pnpm 10, `--ignore-scripts`, `pnpm install --prod`), you get broken installs with no recourse.

A warning log at postinstall (non-interactive, no prompt) is the most you could safely do. But `Cannot find module 'onnxruntime-web'` at import time already tells the user exactly what to install, in the exact context where they'll see it — in their editor or test output, not buried in npm log.

## Recommendation

Don't. Pure cluster 2 + clear import-time error message is cleaner + works in every env. If you want a UX lift, ship a loader that catches the missing-module error and rethrows with an install command:

```js
try {
  await import('onnxruntime-web');
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND') {
    throw new Error(
      "@upscalerjs/real-esrgan requires onnxruntime-web. Run:\n  npm install onnxruntime-web"
    );
  }
  throw e;
}
```

Error lands in user's test output or browser console with one actionable line. No postinstall magic.


## User

Ok. So then we have to accept the tradeoff of; when a model requires a specific engine (TFJS or ONNX) we specify the web version as a... regular dependency? peer dependency? something - and we just accept that users will get it.

And then we _also_ provide a mechanism for dependency injection for node versions


## Assistant

# Final shape

**Regular dep** on the web runtime. Not peer.

```json
// @upscalerjs/<onnx-model>/package.json
{
  "dependencies": {
    "onnxruntime-web": "^1.24"
  }
}
```

Why regular over peer:

| | Regular dep | Required peer | Optional peer |
|---|---|---|---|
| Auto-install | always | npm 7+ / pnpm 8+ | no |
| Version ownership | model pins | host app owns | host app owns |
| Zero-config | yes | yes (modern pkg mgr) | no |
| Consistent across pkg mgrs | yes | mostly | no |
| User can override | via `overrides` field | via version range | via install |

Model owns the ORT version it validated against. Regular dep matches that semantic. Peer dep implies "host app brings this" which isn't true here.

## Trade accepted

- ~138 MB in `node_modules` per ONNX model package, regardless of runtime override
- Bundle impact: zero (tree-shaken when user injects `onnxruntime-node`)
- Node-native users pay disk, not bandwidth

## DI layer (Node opt-in)

Model factory accepts runtime:

```js
// browser + zero-config Node: uses onnxruntime-web from model's dep
import Upscaler from 'upscaler';
import model from '@upscalerjs/real-esrgan/x4';
new Upscaler(model());

// native Node: user installs + injects
import * as ort from 'onnxruntime-node';
new Upscaler(model(ort));
```

Model factory:
```ts
export default (runtime?: OrtLike) => {
  const ort = runtime ?? await import('onnxruntime-web');
  // ...
};
```

## TFJS parallel

Existing TFJS model packages already ship `@tensorflow/tfjs` somewhere (today it's peer on core `upscaler`). Future TFJS model packages follow same shape — `@tensorflow/tfjs` as regular dep, `tfjs-node` / `tfjs-node-gpu` injectable via DI.

Retrofitting today's TFJS model packages is optional; can defer to v3 when the breaking-changes window opens.


## User

We should support both `new Upscaler(model());` and `new Upscaler(model(ort));`


## Assistant

Confirmed. Three equivalent shapes:

```js
new Upscaler(model);       // Upscaler auto-calls factory → web runtime
new Upscaler(model());     // user calls, no runtime arg → web runtime
new Upscaler(model(ort));  // user injects runtime (e.g. onnxruntime-node)
```

Factory signature:
```ts
type Factory = (runtime?: OrtLike) => ResolvedModel;
```

Upscaler constructor accepts `Factory | ResolvedModel`:
```ts
const resolved = typeof arg === 'function' ? arg() : arg;
```

All three paths land on same internal state.


## User

Please open a branch with 1) this transcript verbatim, and 2) a summary document detailing the decisions we came to and the path forward. This will be handed off to another agent.
