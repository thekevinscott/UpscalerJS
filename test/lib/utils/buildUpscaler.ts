import * as path from 'path';
import callExec from './callExec';
// const requestedVersion = process.argv;

const ROOT = path.join(__dirname);
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const buildUpscaler = async (target: 'browser' | 'node') => {
  if (target === 'browser') {
    await callExec(`yarn build:${target}`, {
      cwd: UPSCALER_PATH,
    });
  }

  await callExec(`yarn build:node`, {
    cwd: UPSCALER_PATH,
  });
  await callExec(`yarn build:node-gpu`, {
    cwd: UPSCALER_PATH,
  });
}
