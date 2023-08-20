import path from 'path';
import fsExtra from "fs-extra";
const { readFile } = fsExtra;

type TFJSLibraryTarget = 'browser' | 'node' | 'node-gpu';

export const TFJS_LIBRARY_TARGET_ERROR = (dir: string) => new Error(`Could not determine valid TFJS dependency in directory ${dir}`);

export const getTFJSLibraryTarget = async (dir: string): Promise<TFJSLibraryTarget> => {
  const packageJSON = JSON.parse(await readFile(path.resolve(dir, 'package.json'), 'utf8'));
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

