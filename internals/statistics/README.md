# @internals/statistics

End-to-end pipeline for collecting and analyzing download / CDN usage data for
[UpscalerJS](https://upscalerjs.com) and its `@upscalerjs/*` model packages.

The findings this pipeline produced are written up in [`REPORT.md`](./REPORT.md) —
read that for the audience-segmentation conclusions. They also inform the
project's [`AGENTS.md`](../../AGENTS.md) (real-user volume, the dominant
UMD/script-tag delivery surface, and which model packages carry the most traffic).

## Contents

```
internals/statistics/
├── README.md                          ← you are here
├── REPORT.md                          ← analysis findings (read this for the conclusions)
├── src/
│   ├── bin/
│   │   ├── fetch.ts                    ← Step 1: collect raw data from npm + jsDelivr
│   │   ├── condense.ts                 ← Step 2: shrink the raw output (~18MB → ~150KB)
│   │   └── analyze.ts                  ← Step 3: print the segmentation rollups
│   └── lib/
│       ├── types.ts                    ← raw + slim JSON shapes
│       ├── classify.ts                 ← classifyFile / scaleFactor / isBeta (pure)
│       └── classify.test.ts            ← unit tests for the classifiers
└── data/
    └── upscalerjs-stats.slim.json      ← condensed data from May 2026 (sample input)
```

## Pipeline

```
[ npm + jsDelivr APIs ]
          │
          ▼
  fetch     ──→  upscalerjs-stats.json       (~18MB; daily series for each endpoint)
          │
          ▼
  condense  ──→  upscalerjs-stats.slim.json  (~150KB; totals + per-file + per-version)
          │
          ▼
  analyze   ──→  6 rollups to stdout
```

The condense step exists because the raw output keeps every endpoint's daily
time series. For audience-segmentation analysis we only need totals, per-file
rollups, and per-version rollups; the daily breakdowns are dropped. Pass
`--monthly` to `condense` if you want 12-month rollups preserved (useful for
trajectory questions).

## Running it

Scripts run directly via [`tsx`](https://github.com/privatenumber/tsx) — no build
step. Use `pnpm --filter @internals/statistics <script>` from anywhere in the
monorepo, or run within this directory.

```bash
# Step 1 — collect (needs Node 18+ for native fetch)
pnpm --filter @internals/statistics fetch
# → writes upscalerjs-stats.json in cwd, prints a summary table to stderr
# Options: --out path/to/file.json   --quiet

# Step 2 — condense
pnpm --filter @internals/statistics condense upscalerjs-stats.json
# → writes upscalerjs-stats.slim.json (default path: input dir, basename + .slim.json)
# Options: --out path/to/out.json   --stdout   --monthly

# Step 3 — analyze
pnpm --filter @internals/statistics analyze
# → defaults to the bundled data/upscalerjs-stats.slim.json; pass a path to override
# → prints 6 rollups (totals, file types, scale factors, versions, delivery channels, beta vs stable)

# Tests
pnpm --filter @internals/statistics test:run
```

A bundled `data/upscalerjs-stats.slim.json` from May 2026 is included so `analyze`
can be run immediately without re-fetching.

## Configuration

To add or remove packages, edit the `PACKAGES` array at the top of `src/bin/fetch.ts`.
The condense and analyze steps adapt automatically.

`fetch.ts` uses `last-year` for npm and `?period=year` for jsDelivr. Change the
`NPM_PERIOD` and `JSDELIVR_PERIOD` constants near the top of the file to shift the
window.

## API endpoints used

| Source | Endpoint | Returns |
|---|---|---|
| npm | `https://api.npmjs.org/downloads/range/last-year/<pkg>` | Daily download series for the last year |
| jsDelivr | `https://data.jsdelivr.com/v1/stats/packages/npm/<pkg>?period=year` | Total hits, prev-period hits (for YoY), daily series, rank |
| jsDelivr | `https://data.jsdelivr.com/v1/stats/packages/npm/<pkg>/versions?period=year` | Per-version hit totals |
| jsDelivr | `https://data.jsdelivr.com/v1/package/npm/<pkg>@<version>/stats/file/year` | Per-file hit totals on the most-used version |

Scoped packages (`@upscalerjs/...`) need the `@` and `/` URL-encoded for the npm
API but jsDelivr accepts them raw — the fetcher handles both.

## What's in the slim JSON

```json
[
  {
    "name": "upscaler",
    "npm": { "total": 98529 },
    "cdn": { "total": 492224, "prev": 224168, "yoyPct": 120, "rank": 17971, "typeRank": null },
    "cdnFiles": [
      { "name": "/dist/browser/umd/upscaler.min.js", "total": 244649 }
    ],
    "cdnFilesVersion": "1.0.0-beta.19",
    "cdnVersions": [
      { "version": "1.0.0-beta.19", "total": 395190 }
    ]
  }
]
```

Per-package fields are optional — if a fetch fails, an `npmError` / `cdnError` /
`cdnFilesError` field is set instead. The analysis tolerates missing fields.

## Notes & caveats

- All CDN data is jsDelivr-only. unpkg, cdnjs, and self-hosted bundles are not captured.
- npm download counts include CI builds, mirrors, and indirect-dependency installs.
- The "model-init session" estimate in the report assumes one `model.json` fetch per session.
- jsDelivr asks for fewer than 100 requests per minute; the fetcher includes a 200ms delay between packages.
- YoY percentages are inflated for any package that cut a new beta during the period (old-version traffic decays, new-version traffic concentrates). Ecosystem totals are the honest growth measure.
