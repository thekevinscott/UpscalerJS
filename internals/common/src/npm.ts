import { spawn } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { getLogLevel, verbose } from './logger.js';
import { ROOT_DIR } from './directories.js';

const parseCommand = (_command: string | string[]) => {
  const command = Array.isArray(_command) ? _command : _command.split(' ');
  if (command[0] === 'npm' || command[0] === 'pnpm') {
    return command.slice(1);
  }
  return command;
};

export const runPackageCommand = (
  command: string | string[],
  cwd: string,
  runner: 'npm' | 'pnpm',
) => new Promise<void>((resolve, reject) => {
  const child = spawn(runner, parseCommand(command), {
    shell: true,
    cwd,
    stdio: "inherit"
  });

  child.on('error', reject);

  child.on('close', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(code);
    }
  });
});


export const npmInstall = async (cwd: string, {
  isSilent = false,
  registryURL,
}: {
  isSilent?: boolean;
  registryURL?: string;
} = {}) => {
  const logLevel = getLogLevel();
  const command = [
    'npm',
    'install',
    isSilent ? '--silent' : '',
    '--no-fund',
    '--no-audit',
    '--no-package-lock',
    '--loglevel',
    logLevel,
    registryURL ? `--registry ${registryURL}` : '',
  ].filter(Boolean);
  verbose(`${command.join(' ')} in ${cwd}`);
  await runPackageCommand(command, cwd, 'npm');
};

// These fetch their native addon during their own `install` script rather than
// shipping it in the npm tarball, which makes them the packages that cannot
// survive being relinked with `--ignore-scripts`. See repairNativeAddons.
const NATIVE_ADDON_PACKAGES = [
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
];

const ADDON_RELATIVE_PATH = path.join('lib', 'napi-v8', 'tfjs_binding.node');

const getPackagesMissingTheirAddon = () => {
  const requireFromRoot = createRequire(path.join(ROOT_DIR, 'noop.js'));
  return NATIVE_ADDON_PACKAGES.filter(pkg => {
    let packageDir: string;
    try {
      packageDir = path.dirname(requireFromRoot.resolve(`${pkg}/package.json`));
    } catch {
      return false; // not installed here; nothing to repair
    }
    return !fs.existsSync(path.join(packageDir, ADDON_RELATIVE_PATH));
  });
};

// The bundler work dirs live under `tmp/bundlers/**`, which pnpm-workspace.yaml
// includes as workspace packages, so the install above is *workspace-wide*, not
// local to the bundle. `--fix-lockfile` therefore re-resolves the whole graph:
// against the current lockfile it rewrites ~4k lines, mostly adding
// `(supports-color@x)` peer suffixes. A changed suffix is a changed depPath, so
// pnpm creates a new virtual store directory and repoints node_modules at it.
//
// That new directory is hard linked from the content-addressable store, which
// holds only what was in the npm tarball -- and `--ignore-scripts` means the
// `install` script that fetches the addon never runs. The working addon stays
// behind in the old, now unreferenced directory, and every
// `require('@tensorflow/tfjs-node')` from here on throws "The Node.js native
// addon module (tfjs_binding.node) can not be found".
//
// Dropping `--ignore-scripts` is not the fix: that re-runs every build script in
// the workspace, and tfjs-node's own script then fails with
// `node-pre-gyp: not found`. Rebuilding just the packages that actually lost
// their addon is both narrower and the path that was verified on a runner.
const repairNativeAddons = async () => {
  const missing = getPackagesMissingTheirAddon();
  if (missing.length === 0) {
    return;
  }
  verbose(`Native addon missing after install, rebuilding: ${missing.join(', ')}`);
  await runPackageCommand(['pnpm', 'rebuild', ...missing,], ROOT_DIR, 'pnpm');
};

export const pnpmInstall = async (cwd: string, _opts = {}) => {
  // const logLevel = getLogLevel();
  const command = [
    'pnpm',
    'install',
    '--ignore-scripts',
    '--fix-lockfile'
    // isSilent ? '--silent' : '',
    // '--no-fund',
    // '--no-audit',
    // '--no-package-lock',
    // '--loglevel',
    // logLevel,
    // registryURL ? `--registry ${registryURL}` : '',
  ].filter(Boolean);
  verbose(`${command.join(' ')} in ${cwd}`);
  await runPackageCommand(command, cwd, 'pnpm');
  await repairNativeAddons();
};

export const runPNPMCommand = (
  command: Parameters<typeof runPackageCommand>[0],
  cwd: Parameters<typeof runPackageCommand>[1]
) => runPackageCommand(command, cwd, 'pnpm');
