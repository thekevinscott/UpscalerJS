import { describe, it, expect } from 'vitest';
import { classifyFile, scaleFactor, isBeta } from './classify.js';

describe('classifyFile', () => {
  it('buckets weight shards', () => {
    expect(classifyFile('/x4/group1-shard1of7.bin')).toBe('weights');
  });

  it('buckets model manifests', () => {
    expect(classifyFile('/models/x2/model.json')).toBe('manifest');
  });

  it('buckets UMD bundles', () => {
    expect(classifyFile('/dist/browser/umd/upscaler.min.js')).toBe('umd_bundle');
    expect(classifyFile('/dist/umd/2x.min.js')).toBe('umd_bundle');
  });

  it('buckets ESM: both the +esm shorthand and the esm tree', () => {
    expect(classifyFile('/+esm')).toBe('esm_bundle');
    expect(classifyFile('/dist/browser/esm/index.js')).toBe('esm_bundle');
    expect(classifyFile('/esm/foo.js')).toBe('esm_bundle');
  });

  it('buckets type declarations', () => {
    expect(classifyFile('/dist/index.d.ts')).toBe('types');
  });

  it('buckets sourcemaps, package.json, and readmes', () => {
    expect(classifyFile('/dist/index.js.map')).toBe('sourcemap');
    expect(classifyFile('/package.json')).toBe('package_json');
    expect(classifyFile('/README.md')).toBe('readme');
  });

  it('falls back to other_js then other', () => {
    expect(classifyFile('/dist/some-loose.js')).toBe('other_js');
    expect(classifyFile('/LICENSE')).toBe('other');
  });

  it('is case-insensitive', () => {
    expect(classifyFile('/X4/SHARD.BIN')).toBe('weights');
  });

  it('prioritises .bin over a directory-based bucket', () => {
    // a .bin inside /umd/ is still a weight, not a umd bundle
    expect(classifyFile('/umd/weights.bin')).toBe('weights');
  });
});

describe('scaleFactor', () => {
  it('reads a directory-tagged scale', () => {
    expect(scaleFactor('/models/x4/model.json')).toBe('4');
    expect(scaleFactor('/x2/group1.bin')).toBe('2');
    expect(scaleFactor('/x8/foo')).toBe('8');
  });

  it('reads a filename-tagged scale', () => {
    expect(scaleFactor('/dist/umd/3x.min.js')).toBe('3');
  });

  it('returns null for untagged paths', () => {
    expect(scaleFactor('/dist/browser/umd/upscaler.min.js')).toBeNull();
    expect(scaleFactor('/package.json')).toBeNull();
  });
});

describe('isBeta', () => {
  it('flags pre-release tags', () => {
    expect(isBeta('1.0.0-beta.19')).toBe(true);
    expect(isBeta('1.0.0-canary.3')).toBe(true);
    expect(isBeta('1.0.0-alpha.1')).toBe(true);
    expect(isBeta('1.0.0-rc.2')).toBe(true);
  });

  it('does not flag stable versions', () => {
    expect(isBeta('1.0.0')).toBe(false);
    expect(isBeta('0.13.2')).toBe(false);
  });
});
