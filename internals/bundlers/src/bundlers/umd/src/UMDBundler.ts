import * as url from 'url';
import path from 'path';
import { Bundler } from '../../../utils/Bundler.js';
import { info } from '@internals/common/logger';
import { UPSCALER_DIR } from '@internals/common/constants';
import { getTemplate } from '@internals/common/get-template';
import { getTFJSVersion } from '../../../utils/get-tfjs-version.js';
import { exists, writeFile, copyFile } from '@internals/common/fs';

/***
 * Constants
 */

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const UMD_ROOT_FOLDER = path.join(__dirname, '..');

/***
 * Functions
 */

const writeIndexHTML = async (outDir: string) => {
  const tfjsVersion = await getTFJSVersion();
  const contents = await getTemplate(path.resolve(UMD_ROOT_FOLDER, '_templates/index.html.ejs'), {
    tfjsVersion,
  });
  await writeFile(path.resolve(outDir, 'index.html'), contents);
};

export class UMDBundler extends Bundler {
  port = 0;
  usesRegistry = false;

  get name() { 
    return 'umd bundler';
  }

  async bundle() {
    info('Bundling UMD...');
    const dist = path.resolve(this.outDir, this.dist);

    const pathToUpscalerUMDFile = path.join(UPSCALER_DIR, 'dist/browser/umd/upscaler.min.js');
    if (!await exists(pathToUpscalerUMDFile)) {
      throw new Error('No upscaler UMD file found. Please run the build command for UpscalerJS first.');
    }

    await Promise.all([
      copyFile(pathToUpscalerUMDFile, path.join(dist, 'upscaler.min.js')),
      writeIndexHTML(dist),
    ]);

    info(`Bundled UMD successfully to ${dist}`);
  }
}
