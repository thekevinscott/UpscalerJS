import callExec from "../utils/callExec";
import { mkdirp } from "fs-extra";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import rimraf from 'rimraf';
import { getCryptoName, installLocalPackages, installNodeModules } from "../shared/prepare";
import { LOCAL_UPSCALER_NAME } from "./constants";

const ROOT = path.join(__dirname);
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const prepareScriptBundleForNodeCJS = async () => {
  await installNodeModules(ROOT);
  await installLocalPackages(ROOT, [
    {
      src: UPSCALER_PATH,
      name: LOCAL_UPSCALER_NAME,
    },
  ]);
};

type Stdout = (data: string) => void;
export const executeNodeScriptFromFilePath = async (file: string, stdout?: Stdout) => {
  await callExec(`node "./src/${file}"`, {
    cwd: ROOT
  }, stdout);
};

export const executeNodeScript = async (contents: string, stdout?: Stdout) => {
  const TMP = path.resolve(ROOT, './tmp');
  await mkdirp(TMP);
  const hash = getCryptoName(contents);
  const FILENAME = path.resolve(TMP, `${hash}.js`);
  fs.writeFileSync(FILENAME, contents, 'utf-8');

  await callExec(`node "${FILENAME}"`, {
    cwd: ROOT
  }, stdout);

  rimraf.sync(TMP);
};

export type GetContents = (outputFile: string) => string;
export const testNodeScript = async (contents: GetContents, logExtra = true) => {
  let tmpDir;
  let data;
  const appPrefix = 'upscaler-test';
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));
    const outputFile = path.join(tmpDir, 'data');
    await executeNodeScript(contents(outputFile).trim(), chunk => {
      if (logExtra) {
        console.log('[PAGE]', chunk);
      }
    });
    data = fs.readFileSync(outputFile);
  }
  finally {
    try {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
    catch (e) {
      console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
    }
  }
  return data;
}
