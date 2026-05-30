#!/usr/bin/env tsx
/**
 * Condense the output of `fetch` into a context-friendly summary.
 *
 * The full output keeps every endpoint's daily series — about 18MB across 13
 * packages. This script drops the daily breakdowns and keeps just totals,
 * per-file rollups, and per-version rollups. Result is typically <50KB.
 *
 * Usage:
 *   pnpm --filter @internals/statistics condense upscalerjs-stats.json                  # → upscalerjs-stats.slim.json
 *   pnpm --filter @internals/statistics condense upscalerjs-stats.json --out foo.json
 *   pnpm --filter @internals/statistics condense upscalerjs-stats.json --stdout         # print to stdout
 *   pnpm --filter @internals/statistics condense upscalerjs-stats.json --monthly        # also include 12-month rollup
 *
 * No external deps; just Node.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { RawPackage, SlimPackage } from '../lib/types.js';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const inputPath = positional[0] ?? 'upscalerjs-stats.json';
const WANT_MONTHLY = args.includes('--monthly');
const TO_STDOUT = args.includes('--stdout');
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0
  ? args[outIdx + 1]
  : path.join(path.dirname(inputPath), path.basename(inputPath, '.json') + '.slim.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const monthlyFromNpmDaily = (daily: Array<{ day: string; downloads: number }> = []): Record<string, number> => {
  // npm range returns [{ day: 'YYYY-MM-DD', downloads }, …]
  const buckets: Record<string, number> = {};
  for (const d of daily) {
    const ym = d.day.slice(0, 7);
    buckets[ym] = (buckets[ym] ?? 0) + d.downloads;
  }
  return buckets;
};

const monthlyFromJsdelivrDates = (dates: Record<string, number> = {}): Record<string, number> => {
  // jsDelivr returns { 'YYYY-MM-DD': hits, … }
  const buckets: Record<string, number> = {};
  for (const [date, hits] of Object.entries(dates)) {
    const ym = date.slice(0, 7);
    buckets[ym] = (buckets[ym] ?? 0) + hits;
  }
  return buckets;
};

// ---------------------------------------------------------------------------
// Condense one package
// ---------------------------------------------------------------------------
const condense = (r: RawPackage): SlimPackage => {
  const out: SlimPackage = { name: r.name };

  // ---- npm ----
  if (r.npm) {
    const total = (r.npm.downloads ?? []).reduce((s, d) => s + d.downloads, 0);
    out.npm = { total };
    if (WANT_MONTHLY) out.npm.byMonth = monthlyFromNpmDaily(r.npm.downloads);
  } else if (r.npmError) {
    out.npmError = r.npmError;
  }

  // ---- jsDelivr overall ----
  if (r.jsdelivr) {
    const h = r.jsdelivr.hits ?? {};
    const prev = h.prev?.total ?? null;
    out.cdn = {
      total: h.total ?? 0,
      prev,
      rank: h.rank ?? null,
      typeRank: h.typeRank ?? null,
    };
    if (prev != null && prev > 0) {
      out.cdn.yoyPct = Math.round(((out.cdn.total - prev) / prev) * 100);
    }
    if (WANT_MONTHLY) out.cdn.byMonth = monthlyFromJsdelivrDates(h.dates);
  } else if (r.jsdelivrError) {
    out.cdnError = r.jsdelivrError;
  }

  // ---- Per-file breakdown (keep ALL files, drop daily dates) ----
  if (r.jsdelivrFiles?.files) {
    const files = Object.entries(r.jsdelivrFiles.files)
      .map(([name, v]) => ({ name, total: v.total ?? 0 }))
      .filter((f) => f.total > 0)
      .sort((a, b) => b.total - a.total);
    out.cdnFiles = files;
    if (r.jsdelivrFiles._version) out.cdnFilesVersion = r.jsdelivrFiles._version;
  } else if (r.jsdelivrFilesError) {
    out.cdnFilesError = r.jsdelivrFilesError;
  }

  // ---- Per-version breakdown (top 20, drop daily dates) ----
  // jsDelivr returns either an array directly or { versions: [...] }
  const versionsRaw = Array.isArray(r.jsdelivrVersions)
    ? r.jsdelivrVersions
    : r.jsdelivrVersions?.versions;
  if (Array.isArray(versionsRaw)) {
    out.cdnVersions = versionsRaw
      .map((entry) => ({
        version: entry.version,
        total: entry.hits?.total ?? entry.total ?? 0,
      }))
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }

  return out;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as RawPackage[];
const condensed = raw.map(condense);
const json = JSON.stringify(condensed, null, 2);

if (TO_STDOUT) {
  process.stdout.write(json);
} else {
  fs.writeFileSync(outPath, json);
  const inputSize = fs.statSync(inputPath).size;
  const outputSize = Buffer.byteLength(json);
  process.stderr.write(
    `Condensed ${(inputSize / 1024 / 1024).toFixed(1)}MB → ${(outputSize / 1024).toFixed(1)}KB ` +
    `(${((outputSize / inputSize) * 100).toFixed(1)}% of original)\n`,
  );
  process.stderr.write(`Wrote ${outPath}\n`);
}
