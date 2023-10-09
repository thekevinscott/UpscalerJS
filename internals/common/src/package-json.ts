import path from 'path';
import { readFile } from './fs.js';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
import { ROOT_DIR } from './constants.js';
import { writeFile } from './fs.js';

export type PackageJSONExport = string | {
  require: string;
  import: string;
};

const isPackageJSONExports = (exports: unknown): exports is {
  [index: string]: PackageJSONExport;
} => {
  if (typeof exports !== 'object' || exports === null) {
    return false;
  };
  return Object.entries(exports).reduce((isValid, [_exportName, exportValue]) => {
    return isValid === false ? false : typeof exportValue === 'string' || (typeof exportValue === 'object' && 'require' in exportValue && 'import' in exportValue);
  }, true);
};

export const getPackageJSON = async (folder: string): Promise<JSONSchema> => {
  const packageJSONPath = folder.endsWith('package.json') ? folder : path.resolve(folder, 'package.json');
  return JSON.parse(await readFile(packageJSONPath));
};

export const getPackageJSONExports = async (modelFolder: string): Promise<Array<[string, PackageJSONExport]>> => {
  const { exports } = await getPackageJSON(modelFolder);
  if (!isPackageJSONExports(exports)) {
    throw new Error(`Invalid exports field in package json for ${modelFolder}}: ${JSON.stringify(exports)}`);
  }
  return Object.entries(exports);
};

interface FakeExports {
  [index: string]: string | FakeExports;
}

export type JSONSchema = JSONSchemaForNPMPackageJsonFiles & {
  exports: FakeExports;
};

export type TransformPackageJsonFn = (packageJSON: JSONSchema, dir: string) => JSONSchema;
export type PackageUpdaterLogger = (file: string) => (string | undefined);

export const getPreparedFolderName = (file: string) => {
  return file.split(`${ROOT_DIR}/`).pop();
};

export const getPackageJSONPath = (file: string) => {
  if (file.endsWith('package.json')) {
    return file;
  }
  return path.resolve(file, 'package.json');
}

export const writePackageJSON = async (file: string, contents: unknown) => {
  const stringifiedContents = `${JSON.stringify(contents, null, 2)}\n`;
  await writeFile(getPackageJSONPath(file), stringifiedContents);
};

export const getPackageJSONValue = (packageJSON: JSONSchema, depKey: string) => {
  return depKey.split('.').reduce((json, key) => json?.[key], packageJSON);
}

type Value = JSONSchema[keyof JSONSchema];
export const updatePackageJSONForKey = (packageJSON: JSONSchema, key: string, val: Value): JSONSchema => {
  return getObj(packageJSON, key.split('.'), val);
}

function getObj(obj: JSONSchema, parts: string[], val: Value): JSONSchema {
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
