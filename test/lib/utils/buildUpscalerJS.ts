import path from 'path';
import callExec from './callExec';

const ROOT = path.join(__dirname);
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const buildUpscalerJS = async (type: 'browser' | 'node') => {
  await callExec(`yarn build:${type}`, {
    cwd: UPSCALER_PATH,
  }, false);
};
