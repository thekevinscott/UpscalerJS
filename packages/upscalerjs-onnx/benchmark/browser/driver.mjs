/**
 * Launch headless Chrome, load the bench page, poll window.__done, dump the
 * result JSON.
 */
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
console.log('\n\n=== raw results ===');
console.log(JSON.stringify(results, null, 2));

await browser.close();
server.close();
process.exit(0);
