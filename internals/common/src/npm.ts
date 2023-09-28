import { spawn } from 'child_process';
import { getLogLevel, verbose } from './logger.js';

const parseCommand = (_command: string | string[]) => {
  const command = Array.isArray(_command) ? _command : _command.split(' ');
  if (command[0] === 'npm' || command[0] === 'pnpm') {
    return command.slice(1);
  }
  return command;
};

export const runNPMCommand = (
  command: string | string[],
  cwd: string,
  runner: 'npm' | 'pnpm' = 'npm',
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
  await runNPMCommand(command, cwd);

};

export const pnpmInstall = async (cwd: string, {
  // isSilent = false,
  // registryURL,
}: {
  // isSilent?: boolean;
  // registryURL?: string;
} = {}) => {
  // const logLevel = getLogLevel();
  const command = [
    'pnpm',
    'install',
    '--ignore-scripts',
    // isSilent ? '--silent' : '',
    // '--no-fund',
    // '--no-audit',
    // '--no-package-lock',
    // '--loglevel',
    // logLevel,
    // registryURL ? `--registry ${registryURL}` : '',
  ].filter(Boolean);
  verbose(`${command.join(' ')} in ${cwd}`);
  await runNPMCommand(command, cwd);

};

export const runPNPMCommand = (
  command: Parameters<typeof runNPMCommand>[0],
  cwd: Parameters<typeof runNPMCommand>[1]
) => runNPMCommand(command, cwd, 'pnpm');
