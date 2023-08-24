import path from 'path';
import { readFile } from "@internals/common/fs";
import { Environment } from './types.js';

export type TFJSLibrary = 'browser' | 'node' | 'node-gpu';

export const TFJS_LIBRARY_TARGET_ERROR = (dir: string) => new Error(`Could not determine valid TFJS dependency in directory ${dir}`);

export const getTFJSLibraryTargetFromPackageJSON = async (dir: string): Promise<TFJSLibrary> => {
  const packageJSON = JSON.parse(await readFile(path.resolve(dir, 'package.json')));
  const deps = Object.keys(packageJSON.dependencies);
  if (deps.includes('@tensorflow/tfjs')) {
    return 'browser';
  } else if (deps.includes('@tensorflow/tfjs-node')) {
    return 'node';
  } else if (deps.includes('@tensorflow/tfjs-node-gpu')) {
    return 'node-gpu';
  }

  throw TFJS_LIBRARY_TARGET_ERROR(dir);
};

export const getTFJSLibraryFromTarget = (target: TFJSLibrary): string => {
  if (target === 'node') {
    return '@tensorflow/tfjs-node';
  }
  if (target === 'node-gpu') {
    return '@tensorflow/tfjs-node-gpu';
  }
  return '@tensorflow/tfjs';
}

export const getEnvironmentFromTFJSLibrary = (library: TFJSLibrary): Environment => library === 'browser' ? 'clientside' : 'serverside';
export const getTFJSLibraryFromEnvironment = (env: Environment): TFJSLibrary[] => env === 'clientside' ? ['browser'] : ['node', 'node-gpu'];
