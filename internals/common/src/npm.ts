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
    // This install adds tmp/bundlers/** workspace members that the committed
    // lockfile doesn't cover, so it must be allowed to update the (local)
    // lockfile; CI defaults to --frozen-lockfile otherwise.
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

  // This install can re-resolve peers and relink @tensorflow/tfjs-node into a
  // fresh virtual-store dir whose native addon was never built (scripts are
  // skipped above), so rerun its build script explicitly. -r is required: cwd
  // is a bundler fixture that doesn't itself depend on tfjs-node, and a
  // non-recursive rebuild only covers the current project's dependencies.
  await runPackageCommand(['pnpm', 'rebuild', '-r', '@tensorflow/tfjs-node'], cwd, 'pnpm');
};

export const runPNPMCommand = (
  command: Parameters<typeof runPackageCommand>[0],
  cwd: Parameters<typeof runPackageCommand>[1]
) => runPackageCommand(command, cwd, 'pnpm');
