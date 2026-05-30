import type { FileBucket } from './types.js';

/**
 * Bucket a jsDelivr file path by what kind of asset it is.
 * Ported from analyze-stats.py:classify_file.
 */
export const classifyFile = (name: string): FileBucket => {
  const n = name.toLowerCase();
  if (n.endsWith('.bin')) return 'weights';
  if (n.includes('model.json')) return 'manifest';
  if (n.includes('/umd/') && n.endsWith('.js')) return 'umd_bundle';
  if (n.includes('/esm/') || n === '/+esm' || n.includes('/dist/browser/esm/')) return 'esm_bundle';
  if (n.endsWith('.d.ts')) return 'types';
  if (n.endsWith('.map')) return 'sourcemap';
  if (n.endsWith('package.json')) return 'package_json';
  if (n.endsWith('.md')) return 'readme';
  if (n.endsWith('.js')) return 'other_js';
  return 'other';
};

const SCALE_RE_DIR = /\/x(\d)\//; // /models/x4/...
const SCALE_RE_FILE = /\/(\d)x\.min\.js/; // /dist/umd/4x.min.js

/**
 * Return '2' | '3' | '4' | '8' for files tagged with an ESRGAN scale, else null.
 * Ported from analyze-stats.py:scale_factor.
 */
export const scaleFactor = (name: string): string | null => {
  const m = SCALE_RE_DIR.exec(name) ?? SCALE_RE_FILE.exec(name);
  return m ? m[1] : null;
};

/**
 * A pre-release version tag (beta/canary/alpha/rc).
 * Ported from analyze-stats.py:is_beta.
 */
export const isBeta = (version: string): boolean =>
  version.includes('beta') ||
  version.includes('canary') ||
  version.includes('alpha') ||
  version.includes('rc');
