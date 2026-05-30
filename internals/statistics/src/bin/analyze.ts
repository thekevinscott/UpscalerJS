#!/usr/bin/env tsx
/**
 * Segmentation analysis on the condensed UpscalerJS stats.
 *
 * Reads the output of `condense` (a JSON array of per-package summaries) and
 * prints six rollups to stdout:
 *
 *   1. Per-package totals: npm/yr, CDN/yr, CDN:npm ratio, manifest fetches,
 *      weights-per-manifest (proxy for shards loaded per session).
 *   2. File-type classification (% of CDN hits per package across the file
 *      buckets: weights, manifest, UMD bundle, ESM, types, other).
 *   3. ESRGAN scale-factor distribution (x2/x3/x4/x8 share within each ESRGAN
 *      model's scale-tagged file hits).
 *   4. Top 3 versions per package by CDN hits (with beta/stable tag).
 *   5. Delivery-channel breakdown for the core `upscaler` package
 *      (UMD vs ESM-from-CDN vs TypeScript-tooling crawl vs other).
 *   6. Ecosystem-wide beta vs 1.0.0-stable vs 0.x.x split.
 *
 * Usage:
 *   pnpm --filter @internals/statistics analyze [path/to/upscalerjs-stats.slim.json]
 *
 * Default path: ../../data/upscalerjs-stats.slim.json (relative to this file).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyFile, scaleFactor, isBeta } from '../lib/classify.js';
import type { SlimPackage } from '../lib/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Formatting helpers (mirror Python f-string conventions used in the original)
// ---------------------------------------------------------------------------
const num = (n: number): string => n.toLocaleString('en-US');
const padEnd = (s: string, w: number): string => s.padEnd(w);
const padStart = (s: string, w: number): string => s.padStart(w);
const rule = (n = 96): string => '='.repeat(n);
const dash = (n = 96): string => '-'.repeat(n);

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

// ---------------------------------------------------------------------------
// Rollups
// ---------------------------------------------------------------------------
const perPackageTotals = (data: SlimPackage[]): void => {
  console.log(rule());
  console.log('1. PER-PACKAGE TOTALS');
  console.log(rule());
  console.log('   manifest hits ≈ # of model initializations (TFJS fetches model.json once per init)');
  console.log('   wts/mfst       = avg weight-shard fetches per init (high values = full-model usage)');
  console.log('');
  console.log(
    `${padEnd('Package', 40)} ${padStart('npm/yr', 10)} ${padStart('CDN/yr', 12)} ` +
    `${padStart('CDN:npm', 9)} ${padStart('manifest', 10)} ${padStart('wts/mfst', 9)}`,
  );
  console.log(dash());

  let ecoNpm = 0;
  let ecoCdn = 0;
  let ecoMfst = 0;
  for (const p of data) {
    const npm = p.npm?.total ?? 0;
    const cdn = p.cdn?.total ?? 0;
    ecoNpm += npm;
    ecoCdn += cdn;
    const mfst = sum((p.cdnFiles ?? []).filter((f) => f.name.includes('model.json')).map((f) => f.total));
    const wts = sum((p.cdnFiles ?? []).filter((f) => f.name.endsWith('.bin')).map((f) => f.total));
    ecoMfst += mfst;
    const ratio = npm ? cdn / npm : 0;
    const wpm = mfst ? wts / mfst : 0;
    const mfstS = mfst ? num(mfst) : '-';
    const wpmS = mfst ? wpm.toFixed(1) : '-';
    console.log(
      `${padEnd(p.name, 40)} ${padStart(num(npm), 10)} ${padStart(num(cdn), 12)} ` +
      `${padStart(`${ratio.toFixed(1)}×`, 9)} ${padStart(mfstS, 10)} ${padStart(wpmS, 9)}`,
    );
  }

  console.log(dash());
  const ecoRatio = ecoNpm ? ecoCdn / ecoNpm : 0;
  console.log(
    `${padEnd('ECOSYSTEM TOTAL', 40)} ${padStart(num(ecoNpm), 10)} ${padStart(num(ecoCdn), 12)} ` +
    `${padStart(`${ecoRatio.toFixed(1)}×`, 9)} ${padStart(num(ecoMfst), 10)}`,
  );
  console.log('');
  if (ecoMfst) {
    console.log(
      `~${num(ecoMfst)} model.json fetches in 12mo  →  ` +
      `~${num(Math.floor(ecoMfst / 12))}/month, ~${num(Math.floor(ecoMfst / 365))}/day average model-init sessions on jsDelivr.`,
    );
  }
};

const fileTypeBreakdown = (data: SlimPackage[]): void => {
  console.log('');
  console.log(rule());
  console.log('2. FILE-TYPE CLASSIFICATION  (% of CDN hits within each package)');
  console.log(rule());
  console.log(
    `${padEnd('Package', 40)} ${padStart('weights', 9)} ${padStart('manifest', 9)} ` +
    `${padStart('umd', 8)} ${padStart('esm', 7)} ${padStart('types', 7)} ${padStart('other', 7)}`,
  );
  console.log(dash());
  for (const p of data) {
    if (!p.cdnFiles) continue;
    const buckets: Record<string, number> = {};
    for (const f of p.cdnFiles) {
      const b = classifyFile(f.name);
      buckets[b] = (buckets[b] ?? 0) + f.total;
    }
    const total = sum(Object.values(buckets));
    if (!total) continue;
    const pct = (k: string): string => `${(((buckets[k] ?? 0) / total) * 100).toFixed(1)}%`;
    const otherPct =
      (((buckets.sourcemap ?? 0) + (buckets.package_json ?? 0) + (buckets.readme ?? 0) +
        (buckets.other_js ?? 0) + (buckets.other ?? 0)) / total) * 100;
    console.log(
      `${padEnd(p.name, 40)} ${padStart(pct('weights'), 9)} ${padStart(pct('manifest'), 9)} ` +
      `${padStart(pct('umd_bundle'), 8)} ${padStart(pct('esm_bundle'), 7)} ${padStart(pct('types'), 7)} ` +
      `${padStart(`${otherPct.toFixed(1)}%`, 7)}`,
    );
  }
};

const esrganScaleBreakdown = (data: SlimPackage[]): void => {
  console.log('');
  console.log(rule());
  console.log('3. ESRGAN SCALE-FACTOR DISTRIBUTION  (only scale-tagged file hits)');
  console.log(rule());
  for (const p of data) {
    if (!p.name.includes('esrgan') || p.name.includes('legacy')) continue;
    const byScale: Record<string, number> = {};
    for (const f of p.cdnFiles ?? []) {
      const sf = scaleFactor(f.name);
      if (sf) byScale[sf] = (byScale[sf] ?? 0) + f.total;
    }
    const total = sum(Object.values(byScale));
    if (!total) continue;
    console.log(`\n${p.name}  (scale-tagged hits: ${num(total)})`);
    for (const s of Object.keys(byScale).sort()) {
      console.log(`  x${s}: ${padStart(num(byScale[s]), 10)}  (${padStart(`${((byScale[s] / total) * 100).toFixed(1)}%`, 6)})`);
    }
  }
};

const versionAdoption = (data: SlimPackage[]): void => {
  console.log('');
  console.log(rule());
  console.log('4. VERSION ADOPTION  (top 3 versions per package by CDN hits)');
  console.log(rule());
  for (const p of data) {
    if (!p.cdnVersions?.length) continue;
    const total = sum(p.cdnVersions.map((v) => v.total));
    console.log(`\n${p.name}  (total versioned hits: ${num(total)})`);
    for (const v of p.cdnVersions.slice(0, 3)) {
      const marker = isBeta(v.version) ? '(beta)' : '(stable)';
      console.log(`  ${padEnd(v.version, 20)} ${padStart(num(v.total), 10)}  (${padStart(`${((v.total / total) * 100).toFixed(1)}%`, 6)}) ${marker}`);
    }
  }
};

const coreDeliveryChannels = (data: SlimPackage[]): void => {
  console.log('');
  console.log(rule());
  console.log('5. UPSCALER CORE — DELIVERY-CHANNEL BREAKDOWN');
  console.log(rule());
  const core = data.find((p) => p.name === 'upscaler');
  if (!core || !core.cdnFiles) {
    console.log('  (no `upscaler` package in data)');
    return;
  }
  const buckets: Record<string, number> = {};
  for (const f of core.cdnFiles) {
    const n = f.name.toLowerCase();
    let k: string;
    if (n.includes('/dist/browser/umd/') && n.endsWith('.min.js')) k = 'UMD bundle (script tag)';
    else if (n === '/+esm') k = 'ESM bundle (esm.run / esm.sh)';
    else if (n.includes('/dist/browser/esm/')) k = 'ESM tree crawl (tooling, not users)';
    else if (n.endsWith('.d.ts')) k = 'TypeScript .d.ts crawl (tooling)';
    else if (n.endsWith('package.json')) k = 'package.json (metadata probes)';
    else k = 'other';
    buckets[k] = (buckets[k] ?? 0) + f.total;
  }
  const total = sum(Object.values(buckets));
  for (const [k, v] of Object.entries(buckets).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${padEnd(k, 42)} ${padStart(num(v), 10)}  (${padStart(`${((v / total) * 100).toFixed(1)}%`, 6)})`);
  }
  console.log(`  ${padEnd('TOTAL', 42)} ${padStart(num(total), 10)}`);
};

const betaVsStable = (data: SlimPackage[]): void => {
  console.log('');
  console.log(rule());
  console.log('6. BETA vs STABLE ADOPTION  (CDN hits across all packages)');
  console.log(rule());
  let betaT = 0;
  let stableT = 0;
  let oldT = 0;
  for (const p of data) {
    for (const v of p.cdnVersions ?? []) {
      if (v.version.startsWith('0.')) oldT += v.total;
      else if (isBeta(v.version)) betaT += v.total;
      else stableT += v.total;
    }
  }
  const grand = betaT + stableT + oldT;
  if (!grand) return;
  console.log(`  1.x.x stable:             ${padStart(num(stableT), 12)}  (${padStart(`${((stableT / grand) * 100).toFixed(1)}%`, 6)})`);
  console.log(`  1.x.x beta / canary / rc: ${padStart(num(betaT), 12)}  (${padStart(`${((betaT / grand) * 100).toFixed(1)}%`, 6)})`);
  console.log(`  0.x.x (MAXIM + legacy):   ${padStart(num(oldT), 12)}  (${padStart(`${((oldT / grand) * 100).toFixed(1)}%`, 6)})`);
  console.log(`  TOTAL:                    ${padStart(num(grand), 12)}`);
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
const main = (): number => {
  const defaultPath = path.join(__dirname, '..', '..', 'data', 'upscalerjs-stats.slim.json');
  const argPath = process.argv[2] ?? defaultPath;
  if (!fs.existsSync(argPath)) {
    process.stderr.write(`Could not find ${argPath}. Pass a path or run \`condense\` first.\n`);
    return 1;
  }

  const data = JSON.parse(fs.readFileSync(argPath, 'utf8')) as SlimPackage[];

  perPackageTotals(data);
  fileTypeBreakdown(data);
  esrganScaleBreakdown(data);
  versionAdoption(data);
  coreDeliveryChannels(data);
  betaVsStable(data);
  return 0;
};

process.exit(main());
