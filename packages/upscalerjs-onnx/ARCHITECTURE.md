# UpscalerJS v2.0 — Architecture Plan

Handoff document. Supersedes and refines the prior `PORT-PLAN.md` for architectural decisions made after the initial spike.

Audience: the next agent implementing the port. Assumes familiarity with the spike in `packages/upscalerjs-onnx/` and the prior `PORT-DECISION.md`.

---

## 1. Guiding principles

1. **TFJS development has stalled; ONNX is the forward path.** The port is about adding ONNX as a first-class engine, not replacing TFJS overnight.
2. **Dual-engine, single package.** Users `import Upscaler from 'upscaler'` regardless of engine. Engine is auto-selected from the model's declaration.
3. **Config-free by default.** Users never pick an engine manually. Models declare their own. Engine selection is never a constructor argument for typical use.
4. **Minimize import-path fragmentation.** The current three entry points (`upscaler`, `upscaler/node`, `upscaler/node-gpu`) are a known wart and should not be reproduced for ONNX.
5. **Offline-local-first remains a primary use case.** Any design that requires runtime network dependency for the default happy path is rejected.

---

## 2. Core architectural decisions

### 2.1 Engine seam: virtual engine packages with conditional exports

- `upscaler` itself is engine-agnostic. It knows about the abstract notion of an engine but bundles no specific runtime.
- Each engine gets a tiny wrapper package whose only job is to resolve the right concrete runtime for the current environment:
  - `@upscalerjs/engine-ort` — conditional-exports shim around `onnxruntime-web` (browser) and `onnxruntime-node` (node).
  - `@upscalerjs/engine-tfjs` — conditional-exports shim around `@tensorflow/tfjs` (browser) and `@tensorflow/tfjs-node` (node). **Parallel structure — see §8 "Hanging issues" for open questions about the TFJS side.**
- Conditional exports use `package.json` `exports` field with `"browser"` and `"node"` conditions.
- Escape-hatch subpaths for edge cases (SSR runners, forced environments): `@upscalerjs/engine-ort/node`, `@upscalerjs/engine-ort/web`. Non-default but available.

### 2.2 Model packages peer-dep on the engine shim

- Each first-party model package (e.g. `@upscalerjs/esrgan-medium`) declares its engine via `peerDependencies`:
  ```json
  "peerDependencies": { "@upscalerjs/engine-ort": "^1.0.0" }
  ```
- npm 7+, pnpm 8+, yarn berry all auto-install peer deps by default. Users get the right engine transitively by installing the model.
- `upscaler` itself has no engine deps.
- Switching to a different engine's model = new model package = new peer = new engine installed transitively. No user-visible engine choice.

### 2.3 Dynamic imports at the load boundary

- `upscaler` uses `await import('@upscalerjs/engine-ort')` at the model-load seam.
- Bundlers (Vite, Next.js, esbuild, webpack 5) code-split the engine into its own chunk.
- A TFJS-only app downloads zero bytes of ONNX runtime in the final bundle; an ONNX-only app downloads zero bytes of TFJS.

### 2.4 Weight distribution: GitHub Releases + npm shim

- **GitHub Releases is the canonical weight host.** Weights are uploaded as release assets against a dedicated weights repo (e.g. `thekevinscott/upscaler-weights`). Tagged per model version.
- **npm shim packages are tiny** (~1KB). Each shim contains:
  - The `ModelDefinition` (TypeScript object with scale, input/output ranges, pre/postprocess, layout, etc.).
  - A pinned GitHub Release tag + asset filename + expected SHA-256.
  - A `postinstall` script that fetches the weight asset from GH Releases into the package's directory and verifies the SHA.
- **`npm install` performs the fetch.** Users get weights in `node_modules` after install; works offline thereafter.
- **Hugging Face is the discoverability mirror.** Same weights uploaded to an HF repo with model cards, tags, demos. **Not on the install path.** Publish pipeline should automate the mirror step.
- **Browser direct/CDN path:** script-tag users can load weights directly from GH Releases URLs (CORS headers are permissive on the signed CDN redirect target `objects.githubusercontent.com`). A separate subpath in the shim exposes the URL form:
  ```js
  import def from '@upscalerjs/esrgan-medium';      // local path (node/bundler)
  import def from '@upscalerjs/esrgan-medium/cdn';  // URL (script-tag browser)
  ```

### 2.5 Models declare their own engine

- `ModelDefinition` becomes a discriminated union:
  ```ts
  type ModelDefinition = TfjsModelDefinition | OnnxModelDefinition;
  ```
- `modelType: 'layers' | 'graph' | 'onnx'` discriminates.
- `preprocess` / `postprocess` are typed against each engine's Tensor type. No cross-engine shim layer needed — per user: "I am the only model author. A model only chooses a single engine."
- `Upscaler` inspects `modelType` at model-load time and dispatches to the right engine.

### 2.6 Tensor operations

- The ONNX engine needs its own tensor primitives (slice, concat, pad, rescale, clamp) since it doesn't have `@tensorflow/tfjs` to lean on.
- Already prototyped in the spike at `packages/upscalerjs-onnx/src/shared/tensor-utils.ts`.
- Minimal lift — hundreds of lines of straightforward typed-array code. Promote to the main package during port.

---

## 3. Import path unification

This directly addresses a long-standing pain point: three import entrypoints.

- **`node` vs `node-gpu` collapses.** `onnxruntime-node` includes CPU, CUDA, CoreML, DirectML, and TensorRT under one package, selected at runtime via `executionProviders`. No install-time split.
- **`browser` vs `node` collapses via conditional exports.** The engine shim's `package.json` `exports` field resolves to the right runtime per environment. Users write `import Upscaler from 'upscaler'` everywhere.
- **GPU/provider selection becomes a constructor option**, not a package choice:
  ```ts
  new Upscaler({ model: ..., executionProviders: ['coreml', 'cpu'] })
  ```
- **Net result:** `import Upscaler from 'upscaler'` works for browser, Node CPU, Node GPU, Node + any provider. One import, period.

---

## 4. Critiques and mitigations (postinstall-fetch model)

All 29 critiques discussed in the architecture thread. Ranked by residual risk after mitigation.

### High priority (test in spike)

1. **`--ignore-scripts` in strict CI / Docker security builds.** Weights never downloaded → runtime failure. **Mitigation:** the model package's JS entry detects missing weight file at load time and throws a clear error naming the explicit fallback: `npx upscaler fetch <model-name>`. Same pattern as sharp.
2. **Partial download on network drop.** Leaves incomplete file on disk. **Mitigation:** download to temp file, SHA-verify, atomic rename. Failure leaves no artifact → retry is idempotent.
3. **Corporate proxies (Verdaccio/Nexus/Artifactory).** Cache npm tarballs but not GH Releases. Postinstall outbound HTTPS may be blocked. **Mitigation:** respect `HTTPS_PROXY` / `NO_PROXY` env vars. Document GH Releases allowlisting requirement.
4. **Bundler asset tracing.** After postinstall writes `weights.onnx` to `node_modules/...`, bundlers need to know to copy it to output. **Mitigation:** shim exposes a JS entrypoint that resolves path via `new URL(./weights.onnx, import.meta.url)`. Validate across Vite, Next.js, webpack 5 in the spike.
5. **Serverless (Lambda) deployment size limits.** 250MB unzipped for zip-deployed Lambdas. **Mitigation:** document container-image path for big models. Not ours to fix.
6. **Integrity / MITM.** Corporate TLS-interception proxies can alter downloaded bytes. **Mitigation:** SHA-256 pinned in the shim, verified after download.
7. **pnpm content-addressable store.** Doesn't track postinstall-written files; edge cases around `--frozen-lockfile`. **Mitigation:** runtime check for weight file presence + clear error.

### Medium priority (document)

8. **npm provenance signatures don't cover postinstall-downloaded content.** Workaround: SHA-256 verification at install provides equivalent assurance; surface this in security docs.
9. **Windows-specific quirks** (AV, path length, EPERM on rename). **Mitigation:** test on Windows CI early; copy sharp's error-messaging patterns.
10. **Docker layer cache invalidation** on model version bump. Accepted cost — version bump should invalidate.
11. **Misleading package size** in bundlephobia/packagephobia (reports shim's 1KB, actual footprint is hundreds of MB). **Mitigation:** document true size in README + print size during postinstall.
12. **CI `node_modules` caching.** Default `actions/setup-node` caches only `~/.npm/`, not postinstall output. **Mitigation:** document `actions/cache` on `node_modules` pattern.

### Low priority (accept or monitor)

13. HF rate limits — **resolved by moving off HF for install path**. HF remains for discoverability only.
14. WebContainers CORS for install-time fetch — **resolved by using GH Releases, which sends `Access-Control-Allow-Origin: *` on the signed CDN URL.** WebContainers memory limits remain a concern for very large models; document ceiling.
15. Model license propagation — surface license in shim `package.json` and postinstall output. Commercial users not blindsided.
16. DMCA risk on GH Releases for ambiguous-provenance weights — vet model licenses before publishing. Same risk exists on HF.
17. No SLA on GH (or HF). Accept.
18. Differential updates not possible — full re-download on version bump. Rare event, acceptable.

### Dismissed as non-issues

- Version drift (11/12): models are immutable per version; bump the shim to update weights.
- ONNX CVEs (22/23): same risk regardless of delivery channel.
- HF rate limits / privacy / licensing as install blockers (24/25/26): resolved by moving off HF for install.
- Air-gapped installs (29): same scope as any library with external deps; pre-populate cache or use a mirror.

---

## 5. Engine-ort shim spike (do this first)

Before committing to the architecture, validate the engine-shim pattern with a half-day spike:

1. Build `@upscalerjs/engine-ort` with conditional `exports` plus `/node` and `/web` escape-hatch subpaths.
2. Build one toy model package that peer-deps on it.
3. Verify resolution across the matrix:
   - Vite (browser)
   - webpack 5
   - Next.js — **both SSR and client paths** (biggest real hazard)
   - Plain Node
   - pnpm, npm (not yarn — per user, not supporting)
4. Bundle-size validation: TFJS-only consumer ships zero ONNX bytes; ONNX-only consumer ships zero TFJS bytes.
5. TypeScript types resolve under `moduleResolution: "bundler"`; clear failure under classic `"node"`.

Output: a support-matrix doc + go/no-go on the pattern.

---

## 6. Other spike items (before first release)

- **HF CORS + COEP for cross-origin-isolated contexts** (threaded WASM, WebGPU). Even though install-time fetch is from GH Releases, if users want to cross-check via HF, COEP headers matter.
- **GH Releases CORS verification** for WebContainers/StackBlitz specifically. Research says it works; verify in actual WebContainer sandbox.
- **onnxruntime-web URL-loading of ONNX external-data format** for sharded weights (>2GB single-file limit).
- **Range requests on GH Releases** for partial/resume-capable downloads.
- **Windows CI matrix** early.
- **Test infrastructure** — punted during discussion. Likely answer: commit small ONNX fixtures for unit tests, cache `node_modules` in CI for integration.

---

## 7. Automated publishing pipeline (post-port, but design for it)

The user's stated v2.0+ goal: Python → ONNX conversion with autonomous correctness + perf loops.

Pipeline sketch:
1. **Correctness gate:** reference-image parity between Python inference and JS inference (threshold: max-abs ~5e-3). Mandatory before any publish.
2. **Perf oracle:** deterministic benchmark on pinned hardware in CI. No agent-driven perf changes can merge without holding parity.
3. **Memory-leak oracle:** heap-diff in Node (`--expose-gc` + repeated runs); browser-side `performance.measureUserAgentSpecificMemory()` where available.
4. **Publish step:**
   - Upload ONNX to `thekevinscott/upscaler-weights` GH Release.
   - Compute SHA-256, update the npm shim's pinned hash.
   - Publish shim to npm.
   - Mirror weights to HF for discovery.
5. **Rollback:** since GH Releases preserves historical tags, version pin in the shim gives us a rollback lever.

Autonomy guardrails (worth naming now, implement later): any agent-driven optimization must hold the correctness parity AND pass the perf oracle. No "win the benchmark by regressing accuracy" vectors.

---

## 8. Hanging issues / open questions

These need resolution before or during implementation. Not blocking the overall architecture, but worth explicit decisions.

1. **TFJS engine seam symmetry.** The ONNX side gets `@upscalerjs/engine-ort`. Does TFJS get a mirror `@upscalerjs/engine-tfjs` with conditional exports? If yes, it would also collapse the current `tfjs-node` / `tfjs-node-gpu` split cleanly. If no, we have architectural asymmetry.

2. **Migration path for existing v1 users.** Someone on `@upscalerjs/esrgan-medium@1.x` (TFJS-based). They `npm update`. What do they get?
   - Option A: republish existing model packages as ONNX under a major version bump (v2.0). Users opt in explicitly.
   - Option B: dual-publish both engines under different package names (`-tfjs` / `-onnx` suffixes).
   - Option C: have the model package expose both engine definitions; Upscaler picks based on availability.

3. **Engine dispatch contract in `upscaler` core.** What's the shape of the common engine interface? Each engine has its own Tensor type, session type, loader. Options:
   - Structural typing at the engine-shim boundary (engine exposes a known API).
   - Generic `<Engine>` parametrization throughout (leaks types).
   - A registry pattern where engines self-register.

4. **Model publish pipeline owner.** Who builds the GH Release → SHA pin → npm publish automation? Should exist before the first ONNX model ships.

5. **Node version floor.** Postinstall script uses `fetch()` — requires Node 20+. Is that a breaking change for existing UpscalerJS users? Confirm and document.

6. **Release numbering.** This is v2.0 (major). Strategy for v1-to-v2 coexistence: npm `latest` tag, LTS for v1, migration guide.

7. **WebContainers memory ceiling.** Even with CORS working, in-browser memory limits may block large models during install. Document the approximate cutoff (~100–200MB models should be fine; above that, StackBlitz may OOM).

8. **Monorepo dev workflow.** Local model-package development with pnpm workspaces and a postinstall that fetches from GH Releases. Need a dev-mode override — likely an env var like `UPSCALERJS_LOCAL_WEIGHTS_PATH` that the postinstall respects.

9. **SHA-256 generation workflow.** Who generates the hash committed into the shim? Likely: GH Actions workflow on the weights repo computes SHA at release-publish time and opens a PR to the shim repo. Not user-facing but needs to exist.

10. **Failed-postinstall cleanup semantics.** If the download fails mid-stream, subsequent `npm install` should retry cleanly. Atomic rename on success handles most cases; verify empty-temp-file handling on retry.

11. **CORS for the CDN browser path specifically in cross-origin-isolated apps.** GH Releases' CDN redirect target sends `Access-Control-Allow-Origin: *` but does it send `Cross-Origin-Resource-Policy: cross-origin`? Matters for COEP-enabled pages using threaded WASM / WebGPU. Needs explicit verification.

12. **Shim package npm tarball size.** Shim should be <1MB. Design-time constraint, but code needs to keep it there.

---

## 9. Phased implementation (supersedes prior PORT-PLAN.md phases)

1. **Phase 1 — Engine shim spike.** Build and validate `@upscalerjs/engine-ort`. Half-day. Gate on success.
2. **Phase 2 — Core engine seam in `upscaler`.** Add `modelType: 'onnx'` dispatch. Wire up discriminated-union `ModelDefinition`. Promote spike tensor utils.
3. **Phase 3 — Model distribution pipeline.** Set up `thekevinscott/upscaler-weights` repo with GH Releases publishing. Build shim template with postinstall + SHA verification.
4. **Phase 4 — First ONNX model.** Port ESRGAN-medium as the day-one model. Publish weights, publish shim, verify install + inference end-to-end.
5. **Phase 5 — TFJS engine seam decision** (see §8 item 1). If we go symmetric, build `@upscalerjs/engine-tfjs` and migrate existing packages.
6. **Phase 6 — Bundle / CORS / SSR hygiene tests.** Assertions in CI.
7. **Phase 7 — Migration docs + v2.0-beta release.**
8. **Phase 8 — Automated publishing pipeline** (parity, perf, leak checks).

---

## 10. Out of scope for v2.0

- CLI tool (`npx upscaler ./in.png ./out.png`) — candidate for post-2.0.
- Flipping ONNX to the default engine (v3.0 problem).
- WebGL execution provider for dynamic shapes.
- Community-contributed models via HF (we're sole author for now).

---

## 11. Key references from the thread

- **GH Releases research:** no bandwidth caps, CORS works, 2GB per-file ceiling, sharp/Electron/Playwright ship hundreds of TB/month through it.
- **HF research:** 5-min/IP rate limits, shared-NAT CI fragility, no library-partnership tier, sanctioned heavy use requires `HF_TOKEN`.
- **npm limits:** ~200MB safe packed, ~250MB observed hard ceiling. jsDelivr CDN: 50MB per-file AND 50MB per-package.
- **WebContainers:** Postinstall HTTPS from WebContainers is CORS-gated. GH Releases sends `*`. Memory is the residual concern.
