import { spawn } from 'child_process';
import { getLogLevel, verbose } from './logger.js';

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

// The bundler work dirs live under `tmp/bundlers/**`, which pnpm-workspace.yaml
// includes as workspace packages, so this is a *workspace-wide* install, not a
// local one. `--fix-lockfile` therefore re-resolves the whole graph: against the
// current lockfile it rewrites ~4k lines, mostly adding `(supports-color@x)`
// peer suffixes. A changed suffix means a changed depPath, which means pnpm
// creates a *new* virtual store directory and repoints the symlinks at it.
//
// `--ignore-scripts` used to be passed here. Combined with the above it silently
// destroyed @tensorflow/tfjs-node: the new directory is hard-linked from the
// content-addressable store, which holds only the npm tarball, and tfjs-node
// fetches its native addon (lib/napi-v8/tfjs_binding.node) in its own `install`
// script. Skipping scripts left the addon behind in the old, now-unreferenced
// directory, and every `require('@tensorflow/tfjs-node')` after this point threw
// "The Node.js native addon module (tfjs_binding.node) can not be found".
// Letting scripts run means anything pnpm re-creates here is rebuilt properly.
export const pnpmInstall = async (cwd: string, _opts = {}) => {
  // const logLevel = getLogLevel();
  const command = [
    'pnpm',
    'install',
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

};

export const runPNPMCommand = (
  command: Parameters<typeof runPackageCommand>[0],
  cwd: Parameters<typeof runPackageCommand>[1]
) => runPackageCommand(command, cwd, 'pnpm');
