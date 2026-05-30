# UpscalerJS Audience & Usage Analysis

**Library:** [UpscalerJS](https://upscalerjs.com) — JavaScript image super-resolution & restoration library by Kevin Scott ([github.com/thekevinscott/UpscalerJS](https://github.com/thekevinscott/UpscalerJS))
**Analysis date:** 30 May 2026
**Period covered:** ~12 months trailing (jsDelivr `?period=year`, npm `last-year`)
**Data sources:** npm download API, jsDelivr stats API, site-owner-provided Plausible analytics

---

## TL;DR

1. **The library has ~10× more real users than npm installs suggest.** Across all model packages, jsDelivr served **~450K `model.json` fetches** in 12 months — a reasonable proxy for end-user model-init sessions. That's ~37K/month, ~1.2K/day. By contrast, the docs site sees 387 uniques per 28 days.
2. **The ecosystem CDN-to-npm ratio is 13.5×**, driven extremely unevenly: `esrgan-thick` is **65×** (almost pure script-tag usage); the core `upscaler` package is only **5×**.
3. **Three clearly distinct ESRGAN segments**, separable by scale-factor preference: thumbnail/UI enhancement (slim+medium, mostly x2), default no-decision users (default-model), and quality/restoration (thick, 76% x4).
4. **MAXIM is a real second product, not a side experiment** (~171K CDN hits/yr across the family; high weights-per-manifest ratios indicating real production usage), but it's under-marketed on the homepage.
5. **92.5% of CDN traffic is still on `1.0.0-beta.*` versions; 1.0.0 stable holds only 3.4%.** Stable released ~20 days before this analysis; there is no migration push yet.
6. **`esrgan-legacy` is effectively dead** (6K CDN hits/yr, 3K npm/yr) and can be deprecated.

---

## Methodology & Definitions

| Term | Definition |
|---|---|
| **npm download** | A package fetched from the npm registry. Includes CI, mirrors, and dependency-tree pulls — not 1:1 with humans. |
| **CDN hit** | A single file served by jsDelivr for the package. One end-user session typically generates many CDN hits (one per shard + manifest + bundle). |
| **manifest fetch** | A request for `model.json`. TensorFlow.js fetches this once per model initialization, so the count approximates **model-init sessions**. |
| **weights-per-manifest (wts/mfst)** | Average `.bin` shard fetches per `model.json` fetch. Should approximate the number of shards in the model when users load the full model. Low values may indicate cached or partial loads. |
| **CDN:npm ratio** | A package's CDN hits divided by npm downloads. High = script-tag/UMD-heavy adoption. Low = bundler-pipeline-heavy. |
| **scale-tagged hit** | A CDN file with `/x2/`, `/x3/`, `/x4/`, `/x8/` in the path or a `2x.min.js`-style filename — used to break ESRGAN traffic down by scale factor. |

**Important caveats**

- All CDN data is jsDelivr-only. unpkg, cdnjs, and self-hosted copies are not measured. The CDN totals here are therefore a lower bound on UMD/script-tag usage.
- npm download counts include CI builds, mirrors, and tree-fetches from indirect dependencies. They are not unique-user counts.
- The "model-init sessions" estimate (~1.2K/day) assumes one `model.json` fetch per session, which holds for normal usage but undercounts (a) cached-manifest sessions and overcounts (b) developer testing.
- YoY % comparisons are inflated where a new beta version was published during the period — old-version traffic decays, new-version traffic spikes. Ecosystem totals are the more honest growth measure than per-package YoY.

---

## Per-Package Totals (12mo trailing)

| Package | npm/yr | CDN/yr | CDN:npm | manifest | wts/mfst | YoY |
|---|---:|---:|---:|---:|---:|---:|
| `upscaler` | 98,529 | 492,224 | 5.0× | — | — | +120% |
| `@upscalerjs/default-model` | 93,130 | 822,184 | 8.8× | 112,320 | 5.7 | +1107% |
| `@upscalerjs/esrgan-slim` | 36,792 | 264,416 | 7.2× | 86,135 | 1.0 | +488% |
| `@upscalerjs/esrgan-medium` | 24,001 | 329,686 | 13.7× | 21,329 | 0.9 | +9% |
| `@upscalerjs/esrgan-thick` | 32,128 | 2,093,307 | 65.2× | 221,422 | 7.3 | +1806% |
| `@upscalerjs/esrgan-legacy` | 2,973 | 6,123 | 2.1× | 944 | 1.0 | +130% |
| `@upscalerjs/maxim-denoising` | 4,251 | 34,983 | 8.2× | 1,400 | 22.9 | +67% |
| `@upscalerjs/maxim-deblurring` | 10,366 | 71,533 | 6.9× | 2,993 | 21.6 | +57% |
| `@upscalerjs/maxim-dehazing-indoor` | 1,087 | 7,777 | 7.2× | 449 | 13.2 | +98% |
| `@upscalerjs/maxim-dehazing-outdoor` | 874 | 2,806 | 3.2× | 96 | 11.6 | +111% |
| `@upscalerjs/maxim-deraining` | 1,073 | 5,566 | 5.2× | 286 | 13.3 | +104% |
| `@upscalerjs/maxim-enhancement` | 1,421 | 15,685 | 11.0× | 935 | 14.2 | +126% |
| `@upscalerjs/maxim-retouching` | 1,914 | 32,637 | 17.1× | 2,028 | 13.7 | +109% |
| **ECOSYSTEM** | **308,539** | **4,178,927** | **13.5×** | **450,337** | | |

**Note on wts/mfst:** MAXIM models have 14–22 shards each, and ratios of 11–23 indicate users are loading the full model — confirming production usage rather than incidental probing. ESRGAN's lower ratios (1.0 on slim, 7.3 on thick) reflect both the smaller shard counts and a different access pattern (CDN-cached manifests + selective scale-factor loads).

---

## File-Type Classification (% of CDN hits within each package)

| Package | weights | manifest | UMD | ESM | types | other |
|---|---:|---:|---:|---:|---:|---:|
| `upscaler` | 0% | 0% | **62%** | 15% | 21% | 2% |
| `default-model` | **79%** | 14% | 4% | 3% | 0% | 0% |
| `esrgan-slim` | 38% | 37% | 22% | 2% | 0% | 1% |
| `esrgan-medium` | 11% | 13% | **72%** | 2% | 0% | 2% |
| `esrgan-thick` | **84%** | 11% | 2% | 2% | 0% | 0% |
| `esrgan-legacy` | 19% | 19% | 7% | 12% | 3% | 41% |
| `maxim-denoising` | **92%** | 4% | 2% | 1% | 0% | 2% |
| `maxim-deblurring` | **90%** | 4% | 3% | 1% | 0% | 2% |
| `maxim-dehazing-indoor` | 76% | 6% | 4% | 3% | 0% | 11% |
| `maxim-dehazing-outdoor` | 40% | 3% | 10% | 13% | 3% | 32% |
| `maxim-deraining` | 68% | 5% | 5% | 6% | 1% | 14% |
| `maxim-enhancement` | **85%** | 6% | 2% | 2% | 0% | 5% |
| `maxim-retouching` | **85%** | 6% | 6% | 1% | 0% | 3% |

**Reading the rows:**

- `esrgan-medium` is the anomaly: 72% UMD bundle, only 11% raw weights. People consuming `esrgan-medium` are mostly using its prebuilt `2x.min.js` UMD shim, not pulling the weights directly. This is "drop a script tag, get upscaling" usage.
- `esrgan-thick` and `default-model` show the opposite: 79–84% raw weight files. These are people who already have UpscalerJS bootstrapped (via npm or CDN) and are loading the model weights through the library, not via a per-model UMD bundle.
- The MAXIM family (except dehazing-outdoor and deraining, which have very small totals and noisy distributions) is dominantly weights → real production use, not bundle-and-forget.
- `esrgan-legacy` has a high "other" share because most of its small traffic is README + sourcemaps — diagnostic poking, not deployment.

---

## ESRGAN Scale-Factor Distribution

Each ESRGAN package ships x2, x3, x4, x8 variants. Distribution of scale-tagged hits:

| Package | x2 | x3 | x4 | x8 | Implied use case |
|---|---:|---:|---:|---:|---|
| `esrgan-slim` | 51% | 16% | **27%** | 6% | Mixed UI use; mostly avatars/thumbs (x2) with some quality upscales |
| `esrgan-medium` | **82%** | 4% | 14% | 0% | UI-only; thumbnails and product images |
| `esrgan-thick` | 15% | 8% | **76%** | 1% | Restoration / print-quality / scan upscaling |

The shape difference between `esrgan-medium` (82% x2) and `esrgan-thick` (76% x4) on the same library is the cleanest segmentation evidence in the dataset. They are functionally serving different audiences.

---

## Delivery Channels for the Core Library (`upscaler` package)

| Channel | Hits | Share | Notes |
|---|---:|---:|---|
| UMD bundle (`/dist/browser/umd/upscaler.min.js`) | 244,649 | 62.0% | Real human users via `<script>` tag |
| TypeScript `.d.ts` crawl | 83,459 | 21.1% | **Tooling**: TS language server, packagephobia, etc. |
| ESM tree crawl (`/dist/browser/esm/…`) | 41,179 | 10.4% | **Tooling**, not real users |
| ESM bundle (`/+esm`) | 19,456 | 4.9% | Real users via `esm.run` / `esm.sh` / Deno / Workers |
| package.json | 2,341 | 0.6% | Metadata probes |
| Other | 4,106 | 1.0% | Misc |

After removing tooling/crawler traffic, the human-facing channel mix for the core library is roughly **92% UMD / 7% ESM-from-CDN / 1% other**. Bundler (npm-installed) users sit alongside, at 98K installs/yr. So three real adoption channels exist:

| Channel | Approximate annual volume |
|---|---|
| npm install (bundler users) | 98K installs |
| UMD `<script>` tag from jsDelivr | ~245K loads |
| ESM-from-CDN (esm.run / esm.sh / Deno / edge runtimes) | ~19K loads |

The ESM-from-CDN cohort is small but high-intent: Deno users, Cloudflare Workers, edge functions, and modern minimal-build setups. There's no dedicated guide for them today and they would likely respond to one.

---

## Version Migration Status

| Track | CDN hits | Share |
|---|---:|---:|
| 1.x.x stable | 140,665 | 3.4% |
| 1.x.x beta / canary / rc | 3,864,601 | **92.5%** |
| 0.x.x (MAXIM family + old legacy) | 173,413 | 4.1% |

**Top version per major package** (CDN hits):

| Package | Top version | % of that package's traffic |
|---|---|---:|
| `upscaler` | `1.0.0-beta.19` | 80.3% |
| `@upscalerjs/default-model` | `1.0.0-beta.17` | 98.8% |
| `@upscalerjs/esrgan-slim` | `1.0.0-beta.12` | 88.1% |
| `@upscalerjs/esrgan-medium` | `1.0.0-beta.13` | 49.7% (with `-beta.9` at 28% and `-beta.11` at 17%) |
| `@upscalerjs/esrgan-thick` | `1.0.0-beta.16` | 92.7% |

1.0.0 stable for the core was released ~20 days before this analysis, so the lag is expected. But it means **per-package YoY percentages are inflated for any package that cut a new beta in the period**, and the migration story is essentially untold at present. A "what changed in 1.0.0" / migration post would activate a large pinned audience.

---

## Audience Segmentation

Synthesizing the file-type, scale-factor, channel, and YoY data, four distinguishable segments emerge:

### Segment A — "Make this image look a bit better, fast" (largest by volume)

- **Models:** `esrgan-slim` (mostly x2/x4), `esrgan-medium` (mostly x2 via UMD), `default-model` (which is x2-slim under the hood)
- **Delivery:** mostly UMD `<script>` tags or library auto-load of weights
- **Implied user:** product/web developer adding an "enhance" affordance to user-uploaded images (avatars, profile photos, product photos, UGC, gallery thumbnails)
- **Volume signal:** combined ~1.4M CDN hits/yr across these packages
- **Why this segment exists:** these models are small enough to load on mobile Chrome with acceptable latency, and 2× is the sweet spot for "noticeably crisper" without expensive computation

### Segment B — "Restore or upscale at quality" (highest growth)

- **Model:** `esrgan-thick` at x4 (76% of its scale-tagged hits)
- **Delivery:** library-driven weight loading via CDN (84% of hits are `.bin` shards)
- **Implied user:** an app or tool focused on image restoration, print prep, scan enhancement, or rendering high-quality output from low-resolution sources
- **Volume signal:** 2.09M CDN hits/yr — **largest single package by CDN volume**, and +1806% YoY
- **Why this segment exists:** UpscalerJS is one of very few options for in-browser high-quality upscaling without a Python backend or paid API. The 1806% growth strongly suggests a small number of high-traffic apps drive most of this volume — likely one or two specific deployments worth identifying
- **Investigation hypothesis:** the growth correlates with LLM-recommended adoption (ChatGPT shows up as the #4 referrer in the docs Plausible at 4.4%), and/or a popular extension or web app picking up esrgan-thick in late 2024 / 2025

### Segment C — "I just need upscaling, give me the default"

- **Package:** `@upscalerjs/default-model` (822K CDN hits, 8.8× CDN:npm ratio)
- **Delivery:** mostly weights (79%) loaded by the core library
- **Implied user:** newer developer who followed the two-line install/quickstart, didn't pick a specific model
- **Volume signal:** highest per-package npm install count after the core, and second-highest CDN total
- **Why it matters:** this is the segment most affected by docs and demo polish. They are also the segment most likely to upgrade if migration docs are clear

### Segment D — Image restoration (not upscaling) via MAXIM

- **Models:** `maxim-deblurring` (largest, 71K CDN hits/yr), `maxim-retouching` (32K), `maxim-denoising` (35K), `maxim-enhancement` (16K)
- **Implied user:** photo cleanup tool, document-restoration UI, in-app filter / "fix my photo" features
- **Volume signal:** 171K combined CDN hits, growing 57–126% YoY across the family
- **Notable:** weights-per-manifest ratios of 11–23 indicate full-model loads, not probing — these are real deployments
- **Sub-finding:** `maxim-dehazing-outdoor` (2.8K hits/yr) is barely measurable; consider merging with `dehazing-indoor` or deprecating

---

## What's Likely Depending on UpscalerJS

Without the GitHub dependents-list HTML (robots-blocked from automated fetch), the file-traffic patterns triangulate a set of plausible downstream-application categories:

1. **High-volume UMD `<script>` deployments** — large traffic on `/dist/browser/umd/upscaler.min.js` (245K hits/yr on the core) is consistent with the library being embedded in popular web apps, CMSes, image-gallery widgets, or browser extensions that don't go through a bundler.
2. **At least one high-traffic `esrgan-thick`-using application** — the 2.09M CDN hits on this single package (65× the npm-install count) implies a small number of deployments doing high-quality upscaling at meaningful scale.
3. **Userscripts and Tampermonkey/Stash-style tools** — fits the UMD-loading pattern and the 4% mobile-app browser share in the docs Plausible.
4. **Electron/desktop apps** — implied by the UpscalerJS docs having a specific Electron guide getting traffic and the bundler-user npm cohort (98K installs/yr).
5. **Edge runtimes (Cloudflare Workers, Deno, Bun)** — the 19K /+esm hits over 12 months represent a small but active deployment-via-CDN audience using modern JS runtimes.
6. **Hugging Face Spaces and similar demo platforms** — observed via search results during data collection.

To convert hypotheses into named projects, the GitHub dependents page (`https://github.com/thekevinscott/UpscalerJS/network/dependents`) is the highest-value missing input.

---

## Open Questions & Data Gaps

| Gap | Why it matters | Cheapest fix |
|---|---|---|
| GitHub dependents list | Names the actual downstream projects → real case studies | Paste the HTML; another agent can classify |
| Plausible custom events on `/demo` model selection | Tells you whether docs visitors try the models that actually get deployed (likely a mismatch) | Configure outbound/event goals in Plausible settings |
| jsDelivr referrer data | Would identify the high-volume `esrgan-thick` deployment(s) | jsDelivr support sometimes shares aggregated referrers with package authors on request |
| Per-day trajectory of `esrgan-thick` traffic | Would reveal whether the +1806% YoY is a smooth ramp or a step-change (suggesting a single big adopter) | Re-run `fetch-upscaler-stats.js` and inspect the daily series before condensing |
| unpkg / cdnjs / self-hosted volume | CDN totals here are a lower bound; some segments may be undercounted | unpkg has a basic stats API; cdnjs has none |
| Cookie/consent-aware Plausible goal for "tried demo" | Funnel from docs traffic → demo use → install isn't measurable today | Add a "demo run" goal |

---

## Recommendations

1. **Write a 1.0.0 migration post and link from the homepage.** 92.5% of traffic is pinned to beta versions and will not migrate without a nudge. The audience is unusually concentrated (one beta tag holds 80–99% of traffic on most packages), so a single migration message addresses almost everyone.
2. **Investigate the `esrgan-thick` growth surge.** +1806% YoY on a 2M-hit-per-year package is the single most actionable signal in the dataset. Identifying the responsible deployment(s) yields a case study and informs roadmap priority. Start with jsDelivr referrer data and Google "site:* esrgan-thick" / "site:* upscalerjs".
3. **Elevate MAXIM on the homepage.** 171K CDN hits/yr is a real product, but the homepage today is upscaler-first. A "deblur and restore" pitch with `maxim-deblurring` as the lead would activate this segment.
4. **Add a dedicated ESM-from-CDN guide** (Deno, Workers, Bun, Vite-without-bundle). 19K /+esm hits and the absence of a guide is an unfilled high-intent slot.
5. **Deprecate `esrgan-legacy` and consider merging the MAXIM dehazing variants.** 6K and 2.8K hits/yr respectively, with negligible growth contribution.
6. **Configure Plausible goals on `/demo` model selection.** A one-week sample will confirm or refute the hypothesis that docs visitors don't pick the same models that the deployed audience uses.

---

## Reproducing This Analysis

See `README.md` for the pipeline. The three scripts in `scripts/` go: fetch → condense → analyze. Re-running on fresh data is a single command per stage.
