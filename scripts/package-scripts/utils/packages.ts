import fs from 'fs';
import path from 'path';
import findAllPackages from '../find-all-packages';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

interface FakeExports {
  [index: string]: string | FakeExports;
}

export type JSONSchema = JSONSchemaForNPMPackageJsonFiles & {
  exports: FakeExports;
};

const DIRNAME = __dirname;

export type Package = 'UpscalerJS' | 'Core' | 'Models' | 'Test' | 'Examples' | 'Root' | 'Wrapper' | 'Dev';
export type TransformPackageJsonFn = (packageJSON: JSONSchema, dir: string) => JSONSchema;
export type PackageUpdaterLogger = (file: string) => (string | undefined);

export const UPSCALER_JS = 'UpscalerJS';
export const CORE = 'Core';
export const ROOT = 'Root';
export const WRAPPER = 'Wrapper';
export const EXAMPLES = 'Examples';
export const MODELS = 'Models';
export const TEST = 'Test';
export const DEV = 'Development';
export const DOCS = 'Docs';

export const AVAILABLE_PACKAGES = [ ROOT, UPSCALER_JS, CORE, MODELS, EXAMPLES, TEST, WRAPPER, DEV, DOCS ];

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
  [DEV]: { directory: path.resolve(ROOT_DIR, 'dev') },
  [DOCS]: { directory: path.resolve(ROOT_DIR, 'docs'), multiple: true },
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

export const getPackageJSON = (file: string): JSONSchema => JSON.parse(fs.readFileSync(getPackageJSONPath(file), 'utf-8'));

const defaultTransform: TransformPackageJsonFn = (packageJSON) => packageJSON;

const defaultLogger: PackageUpdaterLogger = (file: string) => undefined;

export const updateMultiplePackages = async (dir: string, transform: TransformPackageJsonFn = defaultTransform, logger: PackageUpdaterLogger = defaultLogger) => {
  const packages = findAllPackages(dir);
  for (let i = 0; i < packages.length; i++) {
    const pkg = path.resolve(ROOT_DIR, packages[i]);
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

export const getPackageJSONValue = (packageJSON: JSONSchema, depKey: string) => {
  return depKey.split('.').reduce((json, key) => json?.[key], packageJSON);
}

type Value = JSONSchema[keyof JSONSchema];
export const updatePackageJSONForKey = (packageJSON: JSONSchema, key: string, val: Value): JSONSchema => {
  return getObj<JSONSchema>(packageJSON, key.split('.'), val);
}

function getObj<T extends Record<string, any>>(obj: T, parts: string[], val: Value): T {
  if (parts.length === 1) {
    return {
      ...obj,
      [parts[0]]: {
        ...obj[parts[0]],
        ...val,
      }
    };
  }
  return {
    ...obj,
    [parts[0]]: getObj(obj[parts[0]], parts.slice(1), val),
  }
}
