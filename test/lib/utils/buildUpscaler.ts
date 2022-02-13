import * as path from 'path';
import callExec from './callExec';
// const requestedVersion = process.argv;

const ROOT = path.join(__dirname);
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const buildUpscaler = async (target: 'browser' | 'node') => {
  await callExec(`yarn scaffold:platform '${target}'`, {
    cwd: UPSCALER_PATH,
  });
  await callExec(`yarn build:${target}`, {
    cwd: UPSCALER_PATH,
  });
}
