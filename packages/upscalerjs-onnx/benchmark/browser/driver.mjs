/**
 * Launch headless Chrome, load the bench page, poll window.__done, dump the
 * result JSON to results/result-<timestamp>.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import puppeteer from 'puppeteer';

const PORT = 4773;
const app = express();
app.use((req, res, next) => {
  // Cross-origin isolation — required for WASM SharedArrayBuffer.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
app.use(express.static('public'));
const server = app.listen(PORT);
await new Promise((r) => server.on('listening', r));
console.log('server up on', PORT);

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan,UseSkiaRenderer',
    '--use-vulkan=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const page = await browser.newPage();
page.on('console', (m) => {
  const t = m.text();
  if (!t.includes('DevTools') && !t.includes('favicon')) console.log('[page]', t);
});
page.on('pageerror', (e) => console.error('[page-error]', e.message));

await page.goto(`http://localhost:${PORT}/index.html`);
await page.waitForFunction('window.__done === true', { timeout: 600000 });

const results = await page.evaluate(() => window.__results);

const resultsDir = path.join(process.cwd(), 'results');
fs.mkdirSync(resultsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(resultsDir, `result-${stamp}.json`);
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

// Also write a compact human-readable markdown summary next to the JSON.
const mdPath = jsonPath.replace(/\.json$/, '.md');
fs.writeFileSync(mdPath, toMarkdown(results));

console.log(`\nwrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`wrote ${path.relative(process.cwd(), mdPath)}`);

await browser.close();
server.close();
process.exit(0);

function toMarkdown(r) {
  const s = r.system;
  const sizes = r.config.SIZES;
  const fmt = (ms) => (ms == null ? '—' : ms.toFixed(1));
  const lines = [];
  lines.push(`# Browser bench — ${s.timestamp}`);
  lines.push('');
  lines.push('## System');
  lines.push(`- UA: \`${s.userAgent}\``);
  lines.push(`- Platform: ${s.platform}, ${s.hardwareConcurrency} cores, crossOriginIsolated=${s.crossOriginIsolated}`);
  lines.push(s.webgpu.available
    ? `- WebGPU: ${s.webgpu.vendor ?? '?'} / ${s.webgpu.architecture ?? '?'} / ${s.webgpu.device || '—'}`
    : `- WebGPU: unavailable (${s.webgpu.reason ?? 'n/a'})`);
  if (s.webgl.available) lines.push(`- WebGL: ${s.webgl.vendor} / ${s.webgl.renderer}`);
  lines.push(`- WASM: SAB=${s.wasm.SharedArrayBuffer}, SIMD=${s.wasm.simd}, threads=${s.wasm.threads}`);
  lines.push(`- Runtimes: tfjs ${s.runtimes.tfjs}, onnxruntime-web ${s.runtimes.ort}`);
  lines.push('');
  lines.push(`## Config`);
  lines.push(`- sizes: ${sizes.join(', ')} · warmup: ${r.config.WARMUP} · iters: ${r.config.ITERS} · patch-loop: ${r.config.PATCHES} × ${r.config.PATCH_SIZE}²`);
  lines.push('');
  lines.push('## Results (ms)');
  lines.push(`| backend | load | ${sizes.map((z) => `${z}→${z * 4}`).join(' | ')} | patch-loop | parity |`);
  lines.push('|' + '---|'.repeat(sizes.length + 3));
  for (const id of Object.keys(r.backends)) {
    const b = r.backends[id];
    if (!b.ok) {
      lines.push(`| ${id} | *${b.error}* |${' — |'.repeat(sizes.length + 2)}`);
      continue;
    }
    const row = [
      id,
      fmt(b.load),
      ...sizes.map((sz) => (b.sizes[sz] ? fmt(b.sizes[sz].median) : '—')),
      fmt(b.patchLoop),
      b.parity ? (b.parity.ok ? `ok (${b.parity.maxAbs.toExponential(1)})` : `**DIFF (${b.parity.maxAbs.toExponential(1)})**`) : '(ref)',
    ];
    lines.push('| ' + row.join(' | ') + ' |');
  }
  lines.push('');
  lines.push(`_reference backend for parity: ${r.referenceFrom}_`);
  return lines.join('\n') + '\n';
}
