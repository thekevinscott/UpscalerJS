import path from 'path';
import fsExtra from 'fs-extra';
const { stat } = fsExtra;
import * as url from 'url';
// const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const EXAMPLES_DIR = path.resolve(__dirname, '../../../../../examples');

export const isValidGuide = async (guide: string) => {
  const guidePath = path.resolve(EXAMPLES_DIR, guide);
  try {
    const stats = await stat(guidePath);
    stats.isDirectory();
  } catch(err) {
    return false;
  }
  return true;
};
