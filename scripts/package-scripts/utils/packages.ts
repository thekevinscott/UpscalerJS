import fs from 'fs';
import path from 'path';
import findAllPackages from '../find-all-packages';

const DIRNAME = __dirname;

export type PackageJson = Record<string, any>;
export type Package = 'UpscalerJS' | 'Core' | 'Models' | 'Test' | 'Examples' | 'Root' | 'Wrapper';
export type TransformPackageJsonFn = (packageJSON: PackageJson, dir: string) => PackageJson;
export type PackageUpdaterLogger = (file: string) => (string | undefined);

export const UPSCALER_JS = 'UpscalerJS';
export const CORE = 'Core';
export const ROOT = 'Root';
export const WRAPPER = 'Wrapper';
export const EXAMPLES = 'Examples';
export const MODELS = 'Models';
export const TEST = 'Test';

export const AVAILABLE_PACKAGES = [ ROOT, UPSCALER_JS, CORE, MODELS, EXAMPLES, TEST, WRAPPER ];

const ROOT_DIR = path.resolve(DIRNAME, '../../..');
const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');

export const DIRECTORIES: Record<string, { directory: string, multiple?: boolean }> = {
  [ROOT]: { directory: ROOT_DIR },
  [UPSCALER_JS]: { directory: path.resolve(PACKAGES_DIR, 'upscalerjs') },
  [CORE]: { directory: path.resolve(PACKAGES_DIR, 'core') },
  [MODELS]: { directory: path.resolve(ROOT_DIR, 'models'), multiple: true },
  [EXAMPLES]: { directory: path.resolve(ROOT_DIR, 'examples'), multiple: true },
  [TEST]: { directory: path.resolve(ROOT_DIR, 'test/lib'), multiple: true },
  [WRAPPER]: { directory: path.resolve(PACKAGES_DIR, 'upscalerjs-wrapper') },
}

export const getPreparedFolderName = (file: string) => {
  return file.split(`${ROOT_DIR}/`).pop();
};

export const getPackageJSONPath = (file: string) => {
  if (file.endsWith('package.json')) {
    return file;
  }
  return path.resolve(file, 'package.json');
}

export const writePackageJSON = (file: string, contents: Record<string, string | number | Object | Array<any>>) => {
  const stringifiedContents = `${JSON.stringify(contents, null, 2)}\n`;
  fs.writeFileSync(getPackageJSONPath(file), stringifiedContents);
};

export const getPackageJSON = (file: string) => JSON.parse(fs.readFileSync(getPackageJSONPath(file), 'utf-8'));

const defaultTransform: TransformPackageJsonFn = (packageJSON) => packageJSON;

const defaultLogger: PackageUpdaterLogger = (file: string) => undefined;

export const updateMultiplePackages = async (dir: string, transform: TransformPackageJsonFn = defaultTransform, logger: PackageUpdaterLogger = defaultLogger) => {
  const packages = findAllPackages(dir);
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    await updateSinglePackage(pkg, transform, logger);
  }
};

export const updateSinglePackage = async (dir: string, transform: TransformPackageJsonFn = defaultTransform, logger: PackageUpdaterLogger = defaultLogger) => {
  const packageJSON = getPackageJSON(dir);
  writePackageJSON(dir, transform(packageJSON, dir));
  const message = logger(dir);
  if (message) {
    console.log(message);
  }
};
