import path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '../../../');
export const MODELS_DIR = path.resolve(ROOT_DIR, 'models');
export const EXAMPLES_DIR = path.resolve(ROOT_DIR, 'examples');
export const TEST_DIR = path.resolve(ROOT_DIR, 'test');
export const FIXTURES_DIR = path.resolve(TEST_DIR, '__fixtures__');

export const DOCS_DIR = path.resolve(ROOT_DIR, 'docs');
export const ASSETS_DIR = path.resolve(DOCS_DIR, 'assets/assets');

export const TMP_DIR = path.resolve(ROOT_DIR, 'tmp');
export const DEV_DIR = path.resolve(ROOT_DIR, 'dev');
export const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');

export const UPSCALER_DIR = path.resolve(PACKAGES_DIR, 'upscalerjs');
export const CORE_DIR = path.resolve(PACKAGES_DIR, 'core');
export const SHARED_DIR = path.resolve(PACKAGES_DIR, 'shared');
export const WRAPPER_DIR = path.resolve(PACKAGES_DIR, 'upscalerjs-wrapper');

export const INTERNALS_DIR = path.resolve(ROOT_DIR, 'internals');
