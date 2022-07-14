import path from 'path';
import callExec from './callExec';

const ROOT = path.join(__dirname);
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const buildUpscaler = async (target: 'browser' | 'node' | 'node-gpu') => {
  await callExec(`pnpm build:${target}`, {
    cwd: UPSCALER_PATH,
  });
}
