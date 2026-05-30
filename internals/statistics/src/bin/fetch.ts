/**
 * UpscalerJS stats fetcher.
 *
 * Pulls last-12-months download numbers from npm and last-12-months CDN hits
 * (overall + per-version + per-file) from jsDelivr for the core `upscaler`
 * package and every `@upscalerjs/*` model package.
 *
 * Output:
 *   - A summary table to stderr (npm/yr, CDN hits/yr, YoY growth, top CDN files)
 *   - Full JSON dump (every endpoint, daily series, file breakdown) to
 *     `upscalerjs-stats.json` (override with --out path/to/file.json)
 *
 * Usage:
 *   pnpm --filter @internals/statistics fetch                  # table + writes JSON file
 *   pnpm --filter @internals/statistics fetch --out foo.json   # custom output path
 *   pnpm --filter @internals/statistics fetch --quiet          # write JSON, no table
 *
 * Requires Node 18+ (native fetch).
 */

import fs from 'node:fs';
import type { RawPackage } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Config — add/remove packages here. Order in summary table is preserved.
// ---------------------------------------------------------------------------
const PACKAGES = [
  'upscaler',
  '@upscalerjs/default-model',
  '@upscalerjs/esrgan-slim',
  '@upscalerjs/esrgan-medium',
  '@upscalerjs/esrgan-thick',
  '@upscalerjs/esrgan-legacy',
  '@upscalerjs/maxim-denoising',
  '@upscalerjs/maxim-deblurring',
  '@upscalerjs/maxim-dehazing-indoor',
  '@upscalerjs/maxim-dehazing-outdoor',
  '@upscalerjs/maxim-deraining',
  '@upscalerjs/maxim-enhancement',
  '@upscalerjs/maxim-retouching',
];

// npm: last-day | last-week | last-month | last-year (range gives daily series)
const NPM_PERIOD = 'last-year';
// jsDelivr: day | week | month | year | all
const JSDELIVR_PERIOD = 'year';

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT_PATH = outIdx >= 0 ? args[outIdx + 1] : 'upscalerjs-stats.json';
const QUIET = args.includes('--quiet');

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
const getJson = async (url: string): Promise<unknown> => {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'upscalerjs-stats-fetcher' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} — ${url}\n${body.slice(0, 200)}`);
  }
  return res.json();
};

// npm wants the scoped name URL-encoded; jsDelivr is happy with @scope/name.
const npmEncoded = (name: string): string => encodeURIComponent(name);

const errMessage = (reason: unknown): string =>
  reason instanceof Error ? reason.message : String(reason);

const fetchOne = async (pkg: string): Promise<RawPackage> => {
  const npmUrl = `https://api.npmjs.org/downloads/range/${NPM_PERIOD}/${npmEncoded(pkg)}`;
  const cdnUrl = `https://data.jsdelivr.com/v1/stats/packages/npm/${pkg}?period=${JSDELIVR_PERIOD}`;
  // Per-version breakdown — tells you which scale (2x/3x/4x/8x) or model size people actually load
  const cdnVersionsUrl = `https://data.jsdelivr.com/v1/stats/packages/npm/${pkg}/versions?period=${JSDELIVR_PERIOD}`;

  const [npm, cdn, cdnVersions] = await Promise.allSettled([
    getJson(npmUrl),
    getJson(cdnUrl),
    getJson(cdnVersionsUrl),
  ]);

  const out: RawPackage = { name: pkg };
  if (npm.status === 'fulfilled') out.npm = npm.value as RawPackage['npm'];
  else out.npmError = errMessage(npm.reason);
  if (cdn.status === 'fulfilled') out.jsdelivr = cdn.value as RawPackage['jsdelivr'];
  else out.jsdelivrError = errMessage(cdn.reason);
  if (cdnVersions.status === 'fulfilled') out.jsdelivrVersions = cdnVersions.value as RawPackage['jsdelivrVersions'];

  // Once we know the top version, fetch per-file stats for it.
  // This is where you see UMD/script-tag usage by filename, e.g. /2x.min.js vs /4x.min.js.
  const versions = out.jsdelivrVersions;
  const topVersion = Array.isArray(versions)
    ? versions[0]?.version
    : versions?.versions?.[0]?.version;
  if (topVersion) {
    const filesUrl = `https://data.jsdelivr.com/v1/package/npm/${pkg}@${topVersion}/stats/file/${JSDELIVR_PERIOD}`;
    try {
      out.jsdelivrFiles = (await getJson(filesUrl)) as RawPackage['jsdelivrFiles'];
      if (out.jsdelivrFiles) out.jsdelivrFiles._version = topVersion;
    } catch (e) {
      out.jsdelivrFilesError = errMessage(e);
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------
const fmt = (n: number | null | undefined): string => (n ?? 0).toLocaleString('en-US');
const pad = (s: string | number, w: number, right = false): string =>
  right ? String(s).padStart(w) : String(s).padEnd(w);

const topFilesFor = (result: RawPackage): Array<{ name: string; total: number }> => {
  const files = result.jsdelivrFiles?.files;
  if (!files) return [];
  // files is an object keyed by filename → { total, dates }
  const entries = Object.entries(files).map(([name, v]) => ({ name, total: v.total ?? 0 }));
  entries.sort((a, b) => b.total - a.total);
  return entries.slice(0, 3);
};

const printSummary = (results: RawPackage[]): void => {
  const rows = results.map((r) => {
    const npmYear = (r.npm?.downloads ?? []).reduce((s, d) => s + d.downloads, 0);
    const cdnYear = r.jsdelivr?.hits?.total ?? 0;
    const cdnPrev = r.jsdelivr?.hits?.prev?.total ?? 0;
    const yoy = cdnPrev ? Math.round(((cdnYear - cdnPrev) / cdnPrev) * 100) : null;
    const topFiles = topFilesFor(r);
    return { pkg: r.name, npmYear, cdnYear, yoy, topFiles };
  });

  const log = (...a: string[]): void => {
    process.stderr.write(`${a.join(' ')}\n`);
  };

  log('');
  log(pad('Package', 38), pad('npm / yr', 14, true), pad('CDN hits / yr', 16, true), pad('YoY', 7, true), '  Top CDN files');
  log('-'.repeat(120));
  for (const r of rows) {
    const growth = r.yoy == null ? '-' : `${r.yoy > 0 ? '+' : ''}${r.yoy}%`;
    const files = r.topFiles.length
      ? r.topFiles.map((f) => `${f.name} (${fmt(f.total)})`).join(', ')
      : '-';
    log(
      pad(r.pkg, 38),
      pad(fmt(r.npmYear), 14, true),
      pad(fmt(r.cdnYear), 16, true),
      pad(growth, 7, true),
      `  ${files}`,
    );
  }
  log('');
  const npmSum = rows.reduce((s, r) => s + r.npmYear, 0);
  const cdnSum = rows.reduce((s, r) => s + r.cdnYear, 0);
  log(`Totals across all packages: ${fmt(npmSum)} npm downloads, ${fmt(cdnSum)} CDN hits (last 12mo).`);
  if (npmSum > 0) {
    log(`CDN-to-npm ratio: ${(cdnSum / npmSum).toFixed(1)}x — UMD/script-tag usage relative to npm installs.`);
  }
};

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const main = async (): Promise<void> => {
  if (typeof fetch !== 'function') {
    throw new Error(`This script needs Node 18+ for native fetch. Detected: ${process.version}`);
  }
  if (!QUIET) process.stderr.write(`Fetching stats for ${PACKAGES.length} packages...\n`);

  const results: RawPackage[] = [];
  for (const pkg of PACKAGES) {
    if (!QUIET) process.stderr.write(`  ${pkg}\n`);
    try {
      results.push(await fetchOne(pkg));
    } catch (e) {
      results.push({ name: pkg, error: errMessage(e) });
    }
    // Polite pause — jsDelivr asks you to contact them if you sustain 100+ rpm.
    await new Promise((r) => setTimeout(r, 200));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  if (!QUIET) {
    printSummary(results);
    process.stderr.write(`\nFull data written to ${OUT_PATH}\n`);
  }
};

main().catch((e: unknown) => {
  process.stderr.write(`${errMessage(e)}\n`);
  process.exitCode = 1;
});
