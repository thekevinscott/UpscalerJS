// @tensorflow/tfjs-node ships its native addon outside the npm tarball and
// fetches it in its own `install` script. That script runs node-pre-gyp via
// `cp.exec` without forwarding stdout/stderr, so when the addon is not produced
// the script still exits 0 and pnpm reports `Done` -- there is nothing in the
// log to see. The failure surfaces minutes later as a vitest "Failed Suites" on
// `require('@tensorflow/tfjs-node')`, in a job that looks unrelated to install.
//
// Asserting here costs ~0.3s and turns that into an install-time failure naming
// the exact path that is missing.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

for (const pkg of ['@tensorflow/tfjs-node', '@tensorflow/tfjs-node-gpu']) {
  const dir = path.dirname(require.resolve(`${pkg}/package.json`));
  const addon = path.join(dir, 'lib', 'napi-v8', 'tfjs_binding.node');
  if (!fs.existsSync(addon)) {
    console.error(`Missing native addon for ${pkg}: ${addon}`);
    process.exit(1);
  }
}

// Existence is not enough: an ABI mismatch or a truncated download only shows up
// on load.
require('@tensorflow/tfjs-node');
