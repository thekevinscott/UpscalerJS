import path from 'path';
import { OutputFormat } from '@internals/common/types';

import { exec } from 'child_process';
import { getLogLevel, verbose } from '@internals/common/logger';

export type StdOut = (chunk: string) => void;
export type StdErr = (chunk: string) => void;

export const callExec = (cmd: string, cwd: string) => new Promise<void>((resolve, reject) => {
  verbose(`Running command: ${cmd}`);
  const spawnedProcess = exec(cmd, { cwd }, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  if (getLogLevel() === 'verbose') {
    spawnedProcess.stderr?.pipe(process.stderr);
  }
});

type CompileTypescriptOpts = {
  outDir?: string;
}
type CompileTypescript = (modelFolder: string, outputFormat: OutputFormat, opts?: CompileTypescriptOpts) => Promise<void>;

export const compileTypescript: CompileTypescript = (modelFolder: string, outputFormat: OutputFormat, {
  outDir,
} = {}) => callExec([
  'tsc',
  '-p',
  path.resolve(modelFolder, `tsconfig.${outputFormat}.json`),
  outDir ? `--outDir ${outDir}` : undefined,
].filter(Boolean).join(' '), modelFolder);
