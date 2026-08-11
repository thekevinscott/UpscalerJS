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

export const pnpmInstall = async (cwd: string, _opts = {}) => {
  // const logLevel = getLogLevel();
  const command = [
    'pnpm',
    'install',
    '--ignore-scripts',
    // pnpm/pnpm#6600 - bug whereby lock files get hasBin stripped
    // resulting in node-pre-gyp not being found
    '--no-frozen-lockfile',
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

  // The bundler work dirs live under `tmp/bundlers/**`, which pnpm-workspace.yaml
  // lists as workspace packages, so the install above is *workspace-wide*.
  // `--no-frozen-lockfile` re-resolves the graph and can change peer suffixes
  // (`_supports-color@x`); a changed suffix is a changed depPath, so pnpm creates
  // a new virtual store directory and repoints node_modules at it. That directory
  // is hard linked from the content-addressable store, which holds only what was
  // in the npm tarball -- and `--ignore-scripts` means the `install` script that
  // fetches `lib/napi-v8/tfjs_binding.node` never runs. Both tfjs node packages
  // therefore lose their native addon here and have to be rebuilt.
  //
  // Both, not just the CPU one: -gpu was omitted when this rebuild was first
  // added, which is why `Integration / Serverside` failed on `loads a model with
  // node-gpu` while every tfjs-node test passed.
  //
  // --workspace-concurrency=1: parallel rebuilds of the same package across
  // projects race in the side-effects cache and corrupt store-hardlinked
  // files (ERR_PNPM_JSON_PARSE on tfjs-node's package.json). Kept as a backstop
  // even though pnpm-workspace.yaml now sets `sideEffectsCache: false`.
  // (--config. form: pnpm rebuild rejects the bare --workspace-concurrency flag)
  await runPackageCommand([
    'pnpm',
    'rebuild',
    '-r',
    '--config.workspace-concurrency=1',
    '@tensorflow/tfjs-node',
    '@tensorflow/tfjs-node-gpu',
  ], cwd, 'pnpm');
};

export const runPNPMCommand = (
  command: Parameters<typeof runPackageCommand>[0],
  cwd: Parameters<typeof runPackageCommand>[1]
) => runPackageCommand(command, cwd, 'pnpm');
