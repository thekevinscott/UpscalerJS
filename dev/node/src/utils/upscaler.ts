import * as path from 'path';
import { MODELS_DIR, UPSCALER_DIR, } from '@internals/common/constants';
import { getPackageJSON } from '@internals/common/package-json';
import { isTFJSLibrary, TFJSLibrary, } from '@internals/common/types';
import { exists } from '@internals/common/fs';
import type * as TFN from '@tensorflow/tfjs-node';
import type * as TFNG from '@tensorflow/tfjs-node-gpu';

type TF = typeof TFN | typeof TFNG;

export const isValidTFJSLibrary = (env: string): env is ValidTFJSLibrary => isTFJSLibrary(env) && ['node', 'node-gpu'].includes(env);
export type ValidTFJSLibrary = Extract<TFJSLibrary, 'node' | 'node-gpu'>;

const checkFile = async (filepath: string) => {
  try {
    await exists(filepath);
  } catch (err) {
    throw new Error(`File ${filepath} does not exist.`);
  }
};

interface ValidExportDefinition {
  require: string;
  import: string;
}

const isValidExportDefinition = (obj: unknown): obj is ValidExportDefinition => !Array.isArray(obj) && typeof obj === 'object' && obj !== null && 'require' in obj;

const importSpecificPackageExport = async (folder: string, key: string) => {
  const { exports: {
    [key]: specificExport,
  } } = await getPackageJSON(folder);
  if (!isValidExportDefinition(specificExport)) {
    throw new Error(`Invalid export definition: ${JSON.stringify(specificExport)} for key ${key} in folder ${folder}`);
  }
  const requireFilePath = path.resolve(folder, specificExport.require);
  await checkFile(requireFilePath);
  return (await import(requireFilePath)).default;
}

export const getUpscaler = async (tfjsLibrary: ValidTFJSLibrary) => importSpecificPackageExport(UPSCALER_DIR, `./${tfjsLibrary}`);

export const getModel = async (tf: TF, packageName: string, modelName: string) => {
  const modelDirectory = path.resolve(MODELS_DIR, packageName);
  const { _internals, ...rest } = await importSpecificPackageExport(modelDirectory, modelName);
  const pathFile = path.resolve(
    MODELS_DIR,
    packageName,
    _internals.path,
  );
  return {
    ...rest,
    path: tf.io.fileSystem(pathFile),
  };
}
