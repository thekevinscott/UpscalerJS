# UpscalerJS v2 — ONNX Migration Decisions

**Status:** Decided 2026-04-21. Supersedes `packages/upscalerjs-onnx/ARCHITECTURE-DECISION.md` and `MODEL-HOSTING-SUMMARY.md`.

**Scope:** single synthesized record for two separate investigations — package architecture (core port, deps, entry points) and model hosting (storage, install, fetch). Each section owns its lane; no cross-derivation.

Transcripts preserved: [`packages/upscalerjs-onnx/TRANSCRIPT.md`](./packages/upscalerjs-onnx/TRANSCRIPT.md) (architecture), [`MODEL-HOSTING-TRANSCRIPT.md`](./MODEL-HOSTING-TRANSCRIPT.md) (hosting).

Spike origin: [PR #1301](https://github.com/thekevinscott/UpscalerJS/pull/1301) (closed). Measured ~2.3× Node/CPU speedup on patch-loop workload; numerical parity vs TF.js to ~1.7e-6. `esrgan-thick` + `esrgan-legacy/gans` fail `tf2onnx` round-trip (custom Keras layers). `esrgan-medium`, `esrgan-slim`, `esrgan-legacy/psnr-small`, `pixel-upsampler` convert cleanly.

---

# Part 1 — Architecture

Owns: engine selection, model export shape, runtime dependency strategy, env split, entry points, Workers support, legacy compat, phase plan.

## A1. Engine discriminator on model

`ModelDefinition` gains `engine: 'tfjs' | 'onnx'` (optional, defaults `'tfjs'`).

- Engine is property of model, not user. No `backend:` flag on `Upscaler`.
- One model ships one engine. Never dual-engine per package.
- Renamed from PR's `modelType` — conflicted with existing `modelType: 'layers' | 'graph'`.
- Dispatch through existing `getUpscaler({ tf, loadModel, ... })` factory seam at `packages/upscalerjs/src/shared/upscaler.ts`.
- Old TF.js models stay TF.js forever. No retroactive conversion.

## A2. Model export shape — callable factory

```ts
type Factory = (runtime?: OrtLike) => ResolvedModel;
```

`Upscaler` constructor accepts `Factory | ResolvedModel`:

```js
new Upscaler(model);       // Upscaler auto-calls factory → default runtime
new Upscaler(model());     // user calls, no runtime arg → default runtime
new Upscaler(model(ort));  // user injects runtime (e.g. onnxruntime-node)
```

All paths normalize:

```ts
const resolved = typeof arg === 'function' ? arg() : arg;
```

## A3. Runtime dependency strategy

**Each model package ships its default runtime as a regular `dependencies` entry.** Runtime matches the model's `engine`:

- ONNX model → `onnxruntime-web`
- TF.js model → `@tensorflow/tfjs` (browser baseline)

```json
{
  "dependencies": {
    "onnxruntime-web": "^1.24"
  }
}
```

**Hard rule:** native/Node-optimized runtime packages (`onnxruntime-node`, `@tensorflow/tfjs-node`, `@tensorflow/tfjs-node-gpu`) are **never** listed in any UpscalerJS package's `dependencies`, `peerDependencies`, or `optionalDependencies`. User-opt-in via DI only (Decision A2's factory argument).

Consequences:
- `npm install upscaler @upscalerjs/<model>` pulls correct default runtime automatically. No peer-dep warnings. No missing-module errors at construct time. Package managers dedupe across multiple model packages.
- Zero-config for browser, Workers, Deno/Bun, and zero-config Node (ORT-Web runs WASM in Node, slower than native but functional).
- Native Node users accept some unused web-runtime bytes in `node_modules`. Tradeoff taken to avoid the transformers.js failure mode (shipping both web and native runtimes as regular deps bloats meta-framework bundles).

Pattern basis: audit of OSS libraries with user-choice sub-dependencies (Drizzle, AI SDK, LangChain, Kysely, Socket.IO adapters, Rollup/PostCSS plugins, Fastify plugins, etc.) converges on separate sibling packages + pure DI. UpscalerJS variant: pure DI for native-runtime override, regular web-runtime dep as zero-config baseline.

## A4. Env split stays

File layout `src/browser/<name>.ts` + `src/node/<name>.ts` + `src/workerd/<name>.ts` continues. Image I/O differs per env (DOM vs `sharp` vs WASM decode); static imports of native modules force env separation. No runtime `typeof window` detection — leaks Node code into browser builds.

Cosmetic cleanup: drop `.browser`/`.node` filename suffix since parent dir already encodes env.

## A5. Entry points — 4 conditional exports

Single root import. Resolution by bundler/runtime condition, not runtime detection.

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

`import Upscaler from 'upscaler'` resolves to correct build in each env.

**Legacy subpaths preserved through v2:** `upscaler/node` and `upscaler/node-gpu` remain as `@deprecated` aliases. Both old and new paths resolve to same build artifacts. Removed at v3.

Deno and Bun currently resolve accidentally via `browser`/`node` conditions. Explicit conditions added on demand.

## A6. Cloudflare Workers — first-party

v2 ships `workerd` condition + Miniflare CI matrix. Workers adapter uses WASM image decode (no `sharp`, no DOM). `onnxruntime-web` WASM runs in workerd unchanged. Real Workers deploy test gates the release.

## A7. Zero-config baseline preserved

`upscaler` package behavior unchanged for existing users:
- `new Upscaler()` with no args still works (default-model + TF.js, as today).
- Existing TF.js model packages unchanged.
- No wrapper package invented.

ONNX is strictly additive — opt-in per model.

## A8. Breaking changes for v2

**None.** Fully additive:
- `engine` field optional on `ModelDefinition`.
- Factory call `model(ort)` optional (constructor accepts resolved object too).
- Root `upscaler` adds conditional exports; doesn't displace old paths.
- `/node`, `/node-gpu` entries remain.
- TF.js peer dep stays on core `upscaler` through v2.

## A9. Deferred to v3 (unscheduled)

- Remove `/node`, `/node-gpu` entries.
- Relocate TF.js peer dep from core to TF.js model packages.
- Retrofit existing TF.js model packages to factory-export shape.
- Drop legacy tooling (pre-`exports` TypeScript, old webpack).

## A10. Rejected

**postInstall prompts to install runtime.** Interactive prompts fail in CI; `--ignore-scripts` common in security-conscious shops; pnpm 10 disables postinstall by default for non-root packages; no ecosystem precedent (Playwright, Puppeteer, Sharp all download non-interactively). Use clear import-time error instead:

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

**Wrapper package** (`@upscalerjs/start`, `/core`, `/auto`, etc.). Keeping `upscaler` zero-config behavior is cleaner.

**Backend flag on `Upscaler` constructor.** Engine is a property of the model.

## Migration phases

### Phase 1 — Seam (invisible)
Add `engine` field to `ModelDefinition`. `Upscaler` accepts `Factory | ResolvedModel`. Dispatcher on `engine`; `'onnx'` branch throws "not yet available".
**Gate:** green CI on existing test matrix, no behavioral diff.

### Phase 2 — ONNX adapter
Promote spike code `packages/upscalerjs-onnx/src/shared/` → `packages/upscalerjs/src/onnx/`. Wire dispatcher. `onnxruntime-web` dynamic-imported on demand.
**Gate:** bundle-size test — TF.js-only bundle has zero ORT bytes.

### Phase 3 — Conditional exports root
Add root entry with 4 conditions (workerd/browser/node/default). `/node`, `/node-gpu` kept, marked `@deprecated`.
**Gate:** CI matrix runs Node, browser (Playwright), workerd (Miniflare), all green on same test suite.

### Phase 4 — Workers adapter
`src/workerd/` with WASM image decode (`@jsquash/*` or equivalent) or `ImageData`/`ArrayBuffer`-only input. Miniflare tests. Docs.
**Gate:** real Workers deploy test.

### Phase 5 — First ONNX model package
Publish `@upscalerjs/<name>` with factory export. Ships `onnxruntime-web` as regular dep. Weights hosted per Part 2.
**Gate:** end-to-end in all four envs (browser bundler, browser UMD, Node, Workers).

### Phase 6 — Release v2.0
MIGRATION.md ("nothing changes unless you want it to"). UMD script-tag examples with **pinned versions**. Deprecation notices on `/node`, `/node-gpu` imports.

## Open (architecture)

1. **First ONNX model target.** Candidates: `esrgan-medium`, `esrgan-slim`, `esrgan-legacy/psnr-small`, `pixel-upsampler`.
2. **Workers image input shape.** WASM decode (`@jsquash/*` vs alternatives) vs caller-supplied `ImageData`/`ArrayBuffer`.
3. **`/node-gpu` fate under ONNX.** ORT-Node selects CPU/CUDA/CoreML/DirectML at session create. Stays v2 as TF.js-only entry; likely collapses into `/node` at v3.
4. **TF.js model package retrofit.** Move existing TF.js packages to factory-export shape at v2, or grandfather until v3? Grandfathering simpler, leaves inconsistent surface.
5. **Deno / Bun explicit conditions.** v2 or wait for demand.
6. **UMD global name for ONNX models.** TF.js UMD uses `window.Upscaler` + per-model globals. ONNX path needs `window.ort` preloaded before UMD script. Docs must pin versions.
7. **Concat-split workaround ownership.** PR #1301's `benchmark/split-concat.py` patches an ORT-Web WebGPU wide-Concat bug on Apple Metal adapters (GPU storage-buffer limit). Mandatory conversion step until fixed upstream. Need issue filed + tracked.
8. **v3 timeline.** Unscheduled. Revisit with v2 adoption data.

---

# Part 2 — Model hosting

Owns: weight storage, install-time fetch (Node), runtime fetch (browser), manifest, filenames, sharding, per-model repo layout, CI release workflow, package-manager matrix. Does **not** own dependency declaration (see Part 1 / A3).

## H1. Problem framing

- Model sizes up to ~1 GB (aspirational ceiling; trend larger).
- NPM-ecosystem-first, JS-dev-targeted.
- UMD + ESM + Node + GPU.
- External contributions welcome.
- Hundreds of models aspirational; ~12 historical.
- Offline install must continue to work for anything that fits in NPM.
- Solo maintainer + agent workforce.

## H2. Constraint findings

- **NPM:** packages capped at the tarball level; practical install-UX ceiling ~100 MB before degradation. 1 GB weights cannot live in NPM.
- **GitHub Releases:** 2 GiB per asset, no bandwidth cap on public repos, no aggregate storage cap. Effectively unbounded for weight distribution. **Does NOT serve CORS headers** — browser `fetch()` against release URLs fails. GH unusable as browser CDN.
- **HuggingFace:** serves CORS (reflects Origin). Per-IP rate limit documented as loose enough for real usage. Unlimited size.
- **jsDelivr:** serves CORS but caps GitHub-mirrored files at 50 MB. Unusable for large weights.
- **ONNX external data tensors:** native mechanism for weight sharding. Arbitrarily many sidecar files, each under 2 GiB. Standard `tf2onnx` / `torch.onnx.export` feature. Both `onnxruntime-node` and `onnxruntime-web` load sidecars natively.

## H3. Hosting split

Dual-origin. CI publishes to both on every model release.

| Path | Origin | Reason |
|---|---|---|
| NPM tarball (small models) | **inline** | `<100 MB` models; keeps `npm install` all-inclusive. |
| Node `postinstall` | **GitHub Releases** | No CORS constraint in Node. No rate limits. Unlimited size. |
| Browser runtime | **HuggingFace** | CORS works. Unlimited size. ML-community discovery free. |

Browser has **no fallback CDN**. GH can't CORS; self-hosted infra (CF R2 etc.) explicitly rejected. Accept: HF outage = cold-load failure for browser users. IndexedDB-cached users unaffected.

## H4. Inline vs external threshold — 100 MB

| Model size | NPM tarball | GH Release | HF repo |
|---|---|---|---|
| `< 100 MB` | weights inline | weights uploaded | weights uploaded |
| `≥ 100 MB` | stub only (manifest + loader) | weights uploaded | weights uploaded |

CI workflow uniform regardless of size — every release pushes to both HF and GH. NPM-inline is an install-time optimization, not a workflow branch.

## H5. Install path (Node) — postInstall fetches weights

Playwright-style `postinstall` script in each model package:

1. Read manifest from `package.json.upscalerjs.weights`.
2. For each weight: check local presence in package dir (NPM-inline case) → skip if sha256 matches.
3. Else fetch from `manifest.cdn.github` → stream to `node_modules/<model>/weights/` with HTTP range-resume.
4. Verify sha256 after write; fail loudly on mismatch.
5. Progress reporting: stderr bar on TTY, JSON line when `CI=true`.

Parallelism: concurrent multi-shard fetch capped at N=4.

Env vars:

- `UPSCALERJS_SKIP_DOWNLOAD=1` — skip install step (CI, `--ignore-scripts`, Docker image baking).
- `UPSCALERJS_CACHE` — override destination (default `node_modules/<model>/weights/`).
- `UPSCALERJS_CDN` — override manifest CDN URL (air-gapped / enterprise mirror).

Fallback CLI: `npx @upscalerjs/<model> install` — same script, invocable after `--ignore-scripts` installs.

## H6. Runtime path (browser)

1. First `upscale()` call streams fetch from `manifest.cdn.huggingface`.
2. Chunked write to IndexedDB as stream progresses.
3. Verify sha256 at end → evict + refetch once on mismatch → fail.
4. Hand merged `ArrayBuffer` to ORT `InferenceSession.create`.
5. Subsequent calls: IndexedDB hit, no network.

API additions:

- `Upscaler.precache(model)` — static; callable at app init or idle.
- `onModelDownloadProgress: ({ loaded, total }) => void` — option on `upscale()` during cold fetch.

## H7. Weight integrity manifest

Lives in `package.json`:

```json
{
  "name": "@upscalerjs/real-esrgan",
  "version": "2.3.0",
  "upscalerjs": {
    "engine": "onnx",
    "weights": [
      { "file": "model.3f8a91c2.onnx",     "sha256": "3f8a91c2...", "size": 4194304 },
      { "file": "weights.a7b4c3d9.data.0", "sha256": "a7b4c3d9...", "size": 1073741824 }
    ],
    "cdn": {
      "github":      "https://github.com/<org>/real-esrgan/releases/download/v2.3.0",
      "huggingface": "https://huggingface.co/<org>/real-esrgan/resolve/v2.3.0"
    }
  }
}
```

- `file` = bare filename. Loader concatenates `<cdn-origin>/<filename>`.
- HF URL uses tag (`resolve/v2.3.0`), not commit SHA. Versions, not opaque hashes.
- HF and GH serve identical flat layout. No subdirs, no path differences.

## H8. Weight filename convention

```
model.<sha-prefix>.onnx
model.<sha-prefix>.data.0
model.<sha-prefix>.data.1
```

`<sha-prefix>` = first 8 hex chars of full SHA-256. Content-addressed. Changed content = changed filename; cached clients don't silently stale.

## H9. ONNX external data sharding (> 2 GiB models)

Native ONNX mechanism. Export:

```python
onnx.save_model(
    model, 'model.onnx',
    save_as_external_data=True,
    all_tensors_to_one_file=False,
    size_threshold=1024,
)
```

Output: `model.onnx` (graph) + N `weights.*` shards. Upload all as GH Release assets + HF repo files. Loader preserves filenames (embedded in `.onnx` graph). Browser: pass `externalData: [{ path, data: arrayBuffer }, ...]` to `InferenceSession.create`.

## H10. Repo layout

- Core `upscaler` + existing TF.js model packages → stay in monorepo `github.com/thekevinscott/UpscalerJS`. No change.
- New ONNX model packages → **one GH repo per model**, under a dedicated org. Reasons: external contribution friction, fleet-scale tag management, release blast-radius isolation, matches HF model-repo convention.

Supporting infra (build up as fleet grows — without these, multi-repo is worse than monorepo):

- **Template repo** `upscalerjs-model-template` — contributors clone + fill metadata.
- **Reusable GH Actions workflows** published once, called from each model repo (`release.yml`, `test.yml`, `convert.yml`).
- **Dependency-bump bot** — automates ORT version bumps across fleet.
- **Catalogue page** in main repo — auto-generated from manifests.
- **Integration test fleet** in main repo — pulls latest release of each model repo, smoke-tests.

## H11. CI release workflow (per model repo)

Tag push triggers:

1. Build weights (ONNX conversion from training checkpoint).
2. Compute SHA-256 per file.
3. Update `package.json.upscalerjs.weights` with shas.
4. Upload all weight files to GH Release.
5. Push same weight files to HF repo at matching tag.
6. Verify both origins return sha-matching content.
7. **Only then** `npm publish`.

All-or-nothing: if either CDN upload fails, abort before npm publish. No manifest ever points at missing/mismatched weights.

## H12. Package-manager support

| PM | Status | Notes |
|---|---|---|
| npm | First-class | Per-project copy; postInstall runs per install. |
| pnpm | First-class | CAS store dedupes via hard-linking. |
| yarn classic | Supported | Like npm. |
| yarn berry (PnP) | Docs-configured | `unplug` entry in `yarnrc.yml` required. |
| bun | Untested | Probably fine; not on initial CI matrix. |

CI matrix: install + load test across npm, pnpm, yarn classic at minimum.

## H13. Rejected

- **Uniform postInstall for all models including small ones** — rejected; NPM-inline for <100 MB preserves "install = done" ergonomics.
- **Peer dependencies for runtimes** — rejected; caused runtime-error-at-construct failure mode. (See also A3.)
- **Runtime-fetch-only (no NPM-inline path)** — rejected; breaks offline install for small models.
- **Global cross-project cache directory** — rejected; counter to JS ecosystem norms; breaks browser bundler asset resolution.
- **jsDelivr as browser CDN** — 50 MB per-file limit.
- **Cloudflare R2 / self-hosted CDN / Worker** — explicitly rejected. Not owning CDN infra.
- **HuggingFace postInstall for Node** — introduces rate-limit exposure at install time; GH has no rate limits.
- **HF as source-of-truth** — for JS-dev library, GH-first + HF-mirror is the correct inversion.

## Open (hosting)

**Blocking (before first ONNX model ships):**

1. **GitHub org for model repos.** Options: everything under `upscaler/` (unified brand, NPM-scope mismatch) vs core on `upscaler/`, models on `upscalerjs/` (GH org = NPM scope).
2. **HuggingFace org naming.** Should align with GH choice.

**Deferable (can land during first model work):**

3. **IndexedDB chunk size.** Start 10 MB; tune for low-end browser memory pressure.
4. **IndexedDB eviction on quota-exceeded.** LRU by last-used timestamp across cache entries is safe default.
5. **Shared IndexedDB cache namespacing across multiple `@upscalerjs/*` models** on same origin.
6. **Service-worker recipe** for PWA use case. Docs-only, not v1-required.
7. **`default-model` handling.** Stays TF.js-engine, inline in `@upscalerjs/default-model`. Confirm with core-port owner.

**Research:**

8. **Aggressive browser caching.** User-flagged separate deliverable — "caching in ways we haven't in the past." Covers: IndexedDB chunk-store layout, service-worker cache-API recipe, precache API ergonomics, quota-exceeded UX. Focused spike.
9. **PM install behavior audit.** Verify empirically: pnpm CAS sharing of postInstall-written files; yarn berry PnP `unplug` behavior vs zip-read of inlined weights; bun behavior.
10. **CI rate-limit story for consumer browser tests.** Pattern: IndexedDB cache between runs, `Upscaler.precache` at test bootstrap, or `UPSCALERJS_CDN` to local proxy. Document; not our infra problem.

---

# References

- Spike PR: [#1301](https://github.com/thekevinscott/UpscalerJS/pull/1301).
- Architecture transcript: [`packages/upscalerjs-onnx/TRANSCRIPT.md`](./packages/upscalerjs-onnx/TRANSCRIPT.md).
- Hosting transcript: [`MODEL-HOSTING-TRANSCRIPT.md`](./MODEL-HOSTING-TRANSCRIPT.md).
- Spike source: `packages/upscalerjs-onnx/src/shared/*` on PR #1301 (not merged).
- Existing factory seam: `packages/upscalerjs/src/shared/upscaler.ts`.
- GH Releases docs: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases.
- GH Releases CORS: https://github.com/orgs/community/discussions/45446.
- jsDelivr file-size limits: https://github.com/jsdelivr/jsdelivr/issues/18268.
- ONNX external data: https://onnx.ai/onnx/repo-docs/ExternalData.html.
