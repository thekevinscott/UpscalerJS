import { exists } from '@internals/common/fs';
import { getLogLevel, verbose } from '@internals/common/logger';
import { runPNPMCommand } from '@internals/common/npm';

export const getPublishCommand = (registryURL: string, _npmrc: string) => [
  'pnpm',
  'publish',
  getLogLevel() !== 'verbose' ? '--silent' : '',
  '--ignore-scripts',
  '--no-git-checks',
  '--registry',
  registryURL,
  '--force',
  // '--config',
  // npmrc,
].join(' ');

export const publishPackage = async (packageName: string, packageDir: string, registryURL: string, npmrc: string) => {
  const publishCommand = getPublishCommand(registryURL, npmrc);
  verbose(`Publishing ${packageName} with command: "${publishCommand}" from directory ${packageDir}`);
  if (!await exists(packageDir)) {
    throw new Error(`Package directory "${packageDir}" does not exist`);
  }
  await runPNPMCommand(publishCommand.split(' ').slice(1), packageDir);
};
