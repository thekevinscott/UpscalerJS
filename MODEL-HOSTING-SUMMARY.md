# Model hosting decision — agent handoff

**Scope:** how UpscalerJS distributes model weights when moving from TF.js-only to
dual-backend TF.js + ONNX. Does NOT cover the core package port itself
(backend seam, dispatcher, dual-backend rollout) — a separate agent owns that.

**Starting point:** [PR #1301](https://github.com/thekevinscott/UpscalerJS/pull/1301) (closed spike)
plus [`packages/upscalerjs-onnx/PORT-DECISION.md`](https://github.com/thekevinscott/UpscalerJS/blob/claude/compare-transformers-onnx-Cw4bE/packages/upscalerjs-onnx/PORT-DECISION.md)
and [`PORT-PLAN.md`](https://github.com/thekevinscott/UpscalerJS/blob/claude/compare-transformers-onnx-Cw4bE/packages/upscalerjs-onnx/PORT-PLAN.md).

Verbatim conversation in [`MODEL-HOSTING-TRANSCRIPT.md`](./MODEL-HOSTING-TRANSCRIPT.md).

---

## Problem framing

- Library supports up to ~1GB models (aspirational ceiling; trend is larger)
- Want zero-config, NPM-ecosystem-first, JS-dev-targeted
- UMD + ESM + Node + GPU (where available)
- Want external contributions
- Aspirational 100s of models; historical ~12 capped on human time
- TF.js models stay as-is forever; ONNX is for new models only
- Offline install must continue working for anything that fits NPM
- Solo maintainer + agent workforce

## Constraint discovery (load-bearing findings)

1. **NPM hard cap: 256MB per package.** Practical UX cap ~50–100MB before install degrades. → 1GB models cannot live in NPM.
2. **GitHub Releases: 2 GiB per asset, 1000 assets per release, no bandwidth cap on public repos, no aggregate storage cap.** Effectively unbounded for weights distribution.
3. **GitHub Releases does NOT serve CORS headers.** Browser `fetch()` against release URLs fails. → GH unusable as browser CDN.
4. **HuggingFace serves CORS.** Reflects Origin. Rate limit `3000 req / 150s per IP` (loose enough for real usage).
5. **jsDelivr serves CORS but caps at 50MB per file for GitHub mirror.** Unusable for large models.
6. **ONNX natively supports weight sharding via external data tensors** — arbitrarily many sidecar files, each under 2 GiB. Standard `tf2onnx` / `torch.onnx.export` feature. Both `onnxruntime-node` and `onnxruntime-web` load them natively.

## Decisions

### Engine discriminator

- Discriminator field on `ModelDefinition`: `engine: 'tfjs' | 'onnx'`
- (Renamed from `modelType` to avoid overload with existing TF.js `modelType: 'layers' | 'graph'`.)
- Engine is a property of the **model**, not the **user**. No `backend:` flag on `Upscaler` constructor.
- A model ships with exactly one engine — never dual-engine per package.
- Old TF.js models stay TF.js forever. No conversion work retroactively.

### Runtime as model-package dependency, not peer dependency

- Each model package has its runtime as a regular `dependencies` entry.
  - ONNX model: `onnxruntime-web` (browser) / `onnxruntime-node` (node) as deps.
  - TF.js model: `@tensorflow/tfjs` / `-node` / `-node-gpu` as deps (migrate from peer).
- Core `upscaler` package: zero runtime dependencies.
- Consequence: `npm install upscaler @upscalerjs/<model>` pulls the right runtime automatically. No peer-dep warnings. No missing-module errors at `new Upscaler({ model })`. `npm` dedupes across multiple model packages.

### Import/entry shape — unchanged from today

```
upscaler              # browser
upscaler/node         # node CPU
upscaler/node-gpu     # node GPU (TF.js specific; ONNX models just use /node — onnxruntime-node handles providers)
```

- Entry point carries environment. Model carries engine. Orthogonal.
- Zero user-visible config delta from today.

### Hosting split — GH for install, HF for runtime

**Dual-origin. CI publishes to both for every model release.**

| Path | CDN | Why |
|---|---|---|
| Node `postinstall` | **GitHub Releases** | No CORS constraint in Node. No rate limits. Unlimited bandwidth + size headroom. |
| Browser runtime | **HuggingFace** | CORS works. Unlimited size. Per-IP rate limits loose enough. ML community discovery free. |
| NPM tarball (small models only) | **inline** | Optimization for <100MB models. `npm install` is all-inclusive for Node. |

Browser has **no fallback CDN** — GH can't CORS, and we're not running our own infra (Cloudflare R2 / Worker etc. explicitly rejected by user). Accept: HF outage = first-load failure for browser users. Cached users (IndexedDB) unaffected.

### Inline vs external threshold

| Model size | NPM tarball | GH Release | HF |
|---|---|---|---|
| <100MB | weights inline | weights uploaded | weights uploaded |
| ≥100MB | stub only (manifest + loader) | weights uploaded | weights uploaded |

CI workflow is uniform regardless of size — every release pushes to both HF and GH. NPM-inline is an install-time optimization, not a workflow branch.

### Install path (Node)

Playwright-pattern `postinstall`:

1. Read manifest from `package.json.upscalerjs.weights`.
2. For each weight file: check local presence in package dir (NPM-inline case) → skip if sha256 matches.
3. Else fetch from `cdn.github` → stream to `node_modules/<model>/weights/` with HTTP-range resume.
4. Verify sha256 after write; fail loudly on mismatch.
5. Progress: stderr bar (TTY) or JSON line (`CI=true`).

Parallelism: fetch multi-shard weights concurrently (N=4 cap).

Env-var surface:

- `UPSCALERJS_SKIP_DOWNLOAD=1` — skip install step (CI, `--ignore-scripts`, Docker image baking)
- `UPSCALERJS_CACHE` — override destination path (default `node_modules/<model>/weights/`)
- `UPSCALERJS_CDN` — override manifest CDN URL (air-gapped / enterprise mirror)

Fallback CLI: `npx @upscalerjs/<model> install` — same script, invocable after `--ignore-scripts` installs.

### Runtime path (browser)

1. First `upscale()` call: stream fetch from `manifest.cdn.huggingface`.
2. Chunked write to IndexedDB as stream progresses (1GB target).
3. Verify sha256 at end → evict + refetch once on mismatch → fail.
4. Hand merged ArrayBuffer to ORT.
5. Subsequent calls: IndexedDB hit, no network.

API surface additions:

- `Upscaler.precache(model)` — static, callable at app init / idle time.
- `onModelDownloadProgress: ({ loaded, total }) => void` — option on `upscale()` during cold fetch.

### Weight integrity manifest

Lives inside `package.json`:

```json
{
  "name": "@upscalerjs/real-esrgan",
  "version": "2.3.0",
  "upscalerjs": {
    "engine": "onnx",
    "weights": [
      { "file": "model.3f8a91c2.onnx",   "sha256": "3f8a91c2...", "size": 4194304 },
      { "file": "weights.a7b4c3d9.data.0", "sha256": "a7b4c3d9...", "size": 1073741824 }
    ],
    "cdn": {
      "github":      "https://github.com/upscaler/real-esrgan/releases/download/v2.3.0",
      "huggingface": "https://huggingface.co/upscaler/real-esrgan/resolve/v2.3.0"
    }
  }
}
```

- `file` field = bare filename. Loader concatenates `<cdn-origin>/<filename>`.
- HF URL uses tag (`resolve/v2.3.0`), not commit hash. Versions, not opaque SHAs.
- HF and GH repos serve the same flat file layout — no subdirs, no path differences.

### Weight filename convention

```
model.<sha-prefix>.onnx
model.<sha-prefix>.data.0
model.<sha-prefix>.data.1
```

Where `<sha-prefix>` = first 8 hex chars of full SHA-256. Content-addressed. Force-push-resistant: changed content = changed filename, cached clients don't silently stale.

### ONNX external data sharding (for >2 GiB single-model files)

Use ONNX's native mechanism. Export:

```python
onnx.save_model(
    model, 'model.onnx',
    save_as_external_data=True,
    all_tensors_to_one_file=False,
    size_threshold=1024,
)
```

Output: `model.onnx` (graph) + N `weights.*` shards. Upload all as GH Release assets + HF repo files. Loader preserves filenames (embedded in `.onnx` graph). Browser loader passes `externalData: [{ path, data: arrayBuffer }, ...]` to `InferenceSession.create`.

### Repo layout

- Core `upscaler` package + existing TF.js model packages → stay in existing monorepo `github.com/thekevinscott/UpscalerJS` (no change).
- New ONNX model packages → **one GH repo per model**, under an org.
- Reasons: external contribution friction, fleet-scale tag management, isolation of release blast radius, matches HF model-repo convention.

Required supporting infrastructure:

- **Template repo** (`upscalerjs-model-template`) — contributor clones + fills in metadata.
- **Reusable GH Actions workflows** — published once, called from each model repo (`release.yml`, `test.yml`, `convert.yml`).
- **Dependency-bump bot** — automates ORT version bumps across all model repos.
- **Catalogue page** in main repo — auto-generated from manifest listing every model repo.
- **Integration test fleet** — main repo CI pulls latest release of each model repo, smoke-tests.

Without these, multi-repo is worse than monorepo. Build them up as the fleet grows.

### CI release workflow (per model repo)

Tag push triggers:

1. Build weights (ONNX conversion from training checkpoint).
2. Compute SHA-256 for each file.
3. Update `package.json.upscalerjs.weights` with sha values.
4. Upload all weight files to GH Release for tag.
5. Push weight files to HF repo at matching tag.
6. Verify both origins return sha-matching content.
7. **Only then** `npm publish`.

All-or-nothing atomicity: if either CDN upload fails, abort before npm publish. Users never get a manifest pointing at missing or mismatched weights.

### Package manager support

| Package manager | Status | Notes |
|---|---|---|
| npm | First-class | Per-project copy. postInstall runs per install. |
| pnpm | First-class | CAS store dedupes for free via hard-linking. |
| yarn classic | Supported | Like npm. |
| yarn berry (PnP) | Docs-configured | Needs `unplug` entry in `yarnrc.yml`. |
| bun | Untested | Probably fine; not on initial CI matrix. |

CI matrix: install + load test across npm, pnpm, yarn classic at minimum.

---

## Decisions explicitly rejected

- **Uniform postInstall for ALL models (even small)** — rejected in favor of NPM-inline for <100MB. Preserves "install = done" ergonomics for small-model users.
- **Peer dependencies for runtimes** — rejected. Caused runtime-error-at-construct failure mode. Regular deps let npm resolve automatically.
- **Runtime-fetch-only (no NPM-inline path)** — rejected. Breaks offline install for small models that used to "just work."
- **Global cross-project cache directory** — rejected. Counter-intuitive to JS ecosystem norms. Messes with browser bundler asset resolution.
- **jsDelivr as browser CDN** — blocked by 50MB per-file limit.
- **Cloudflare R2 or any other self-hosted CDN / Worker** — **explicitly rejected.** User does not want to own CDN infrastructure.
- **Backend flag on `Upscaler` constructor** — rejected. Engine is a property of the model, not user intent.
- **HuggingFace postInstall script for Node** — would introduce rate-limit exposure at install time. GH has no rate limits.
- **HF as source-of-truth** — scope depends on researcher workflow; for JS-dev-targeted library, GH-first + HF-mirror is the inverted (correct) shape.

## Open decisions / questions

### Blocking (needed before first ONNX model ships)

1. **GitHub org for model repos.** User owns both `upscaler` and `upscalerjs` GitHub orgs.
   - Option A: everything under `upscaler/` org (unified brand, NPM-scope mismatch for models)
   - Option B: core on `upscaler/`, models on `upscalerjs/` (GH org = NPM scope for models)
   - User deferred. Resolve before first model repo is created.

2. **HuggingFace org naming.** Parallel decision: `huggingface.co/upscaler` vs `huggingface.co/upscalerjs`. Ideally aligns with GH org choice above.

### Deferable (can land during first model work)

3. **Exact NPM-inline cutoff.** Current proposal: 100MB. Arbitrary. Refine based on real install-time measurements. 50MB may be safer for slow networks.

4. **IndexedDB chunk size.** Implementation detail. Start at 10MB; tune based on memory pressure in low-end browsers.

5. **IndexedDB eviction policy on quota exceeded.** Needs defined behavior when browser's storage quota hits. LRU by last-used timestamp across model cache entries is the safe default.

6. **Shared IndexedDB cache across multiple `@upscalerjs/*` models on the same origin.** Namespacing scheme for the cache DB. Content-addressed naming makes collision impossible; still need a policy.

7. **Service worker recipe** for PWA use case. Docs-only, not required for v1.

8. **`default-model` handling** (the zero-args `new Upscaler()` case). User flagged as "don't change historical behavior." Stays TF.js-engine, stays inline in `@upscalerjs/default-model`. Should be confirmed with whoever owns the core package port.

### Research items

9. **Aggressive browser caching.** User flagged as a separate deliverable — "caching in ways we haven't in the past." Concretely: IndexedDB chunk-store layout, optional service worker recipe for cache-API backing, precache API ergonomics, quota-exceeded UX. Worth a focused spike.

10. **Package-manager install behavior audit.** Confirm empirically:
    - Does `pnpm`'s CAS store share postInstall-written files across projects? (Believed yes; verify.)
    - Does `yarn berry` PnP need `unplug` for our case, or does zip-read of NPM-inlined weights work unchanged?
    - Bun behavior.

11. **CI rate-limit story for consumer browser tests.** Advice: IndexedDB caches between runs, prefetch via `Upscaler.precache`, or set `UPSCALERJS_CDN` to a local proxy. Document as a pattern; not our infra problem.

---

## Handoff to next agent

The agent picking up the ONNX port should own:

- Engine discriminator implementation in `ModelDefinition`
- Core `upscaler` package dual-backend seam + dispatcher
- Dynamic-import bundle hygiene (TF.js user gets zero ONNX bytes, vice versa)
- Browser caching architecture (item 9 research above, or ship minimum viable IndexedDB chunked cache)
- Model conversion pipeline per-model-package (not central)
- Template repo scaffolding
- Reusable GH Actions for release automation
- Integration test fleet in core repo

Hosting architecture (this doc) is the constraint set they operate within. Changes to anything above that would affect hosting (e.g. a different engine discriminator shape, a different entry-point structure) should loop back for a hosting review.

---

## References

- Original spike: [PR #1301](https://github.com/thekevinscott/UpscalerJS/pull/1301)
- PORT-DECISION.md: [on PR branch](https://github.com/thekevinscott/UpscalerJS/blob/claude/compare-transformers-onnx-Cw4bE/packages/upscalerjs-onnx/PORT-DECISION.md)
- PORT-PLAN.md: [on PR branch](https://github.com/thekevinscott/UpscalerJS/blob/claude/compare-transformers-onnx-Cw4bE/packages/upscalerjs-onnx/PORT-PLAN.md)
- GH Releases limits: [docs](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- GH Releases CORS behavior: [community discussion #45446](https://github.com/orgs/community/discussions/45446)
- jsDelivr file-size limits: [issue #18268](https://github.com/jsdelivr/jsdelivr/issues/18268)
- ONNX external data tensors: [onnx.ai docs](https://onnx.ai/onnx/repo-docs/ExternalData.html)
