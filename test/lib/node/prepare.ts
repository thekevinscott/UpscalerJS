import callExec from "../utils/callExec";
import { mkdirp } from "fs-extra";
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { getCryptoName, installLocalPackages, installNodeModules, withTmpDir } from "../shared/prepare";
import { LOCAL_UPSCALER_NAMESPACE, LOCAL_UPSCALER_NAME } from "./constants";
import { getAllAvailableModelPackages } from "../../../scripts/package-scripts/utils/getAllAvailableModels";

const ROOT = path.join(__dirname);
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs');
const MODELS_PATH = path.join(ROOT, '../../../models');

export const prepareScriptBundleForNodeCJS = async () => {
  await installNodeModules(ROOT);
  await installLocalPackages(ROOT, [
    {
      src: UPSCALER_PATH,
      name: LOCAL_UPSCALER_NAME,
    },
    ...getAllAvailableModelPackages().map(packageName => ({
      src: path.resolve(MODELS_PATH, packageName),
      name: path.join(LOCAL_UPSCALER_NAMESPACE, packageName),
    })),
  ]);
};

type Stdout = (data: string) => void;
export const executeNodeScriptFromFilePath = async (file: string, stdout?: Stdout) => {
  await callExec(`node "./src/${file}"`, {
    cwd: ROOT
  }, stdout);
};

export const executeNodeScript = async (contents: string, stdout?: Stdout) => {
  await withTmpDir(async tmpDir => {
    const hash = getCryptoName(contents);
    const FILENAME = path.resolve(tmpDir, `${hash}.js`);
    fs.writeFileSync(FILENAME, contents, 'utf-8');

    await callExec(`node "${FILENAME}"`, {
      cwd: ROOT
    }, stdout);
  }, path.resolve(ROOT, './tmp'))
};

export type GetContents = (outputFile: string) => string;
export const testNodeScript = async (contents: GetContents, logExtra = true) => {
  let data;
  await withTmpDir(async tmpDir => {
    const outputFile = path.join(tmpDir, 'data');
    await executeNodeScript(contents(outputFile).trim(), chunk => {
      if (logExtra) {
        console.log('[PAGE]', chunk);
      }
    });
    data = fs.readFileSync(outputFile);
  });
  return data;
}
