import callExec from "../utils/callExec";
import { mkdirp } from "fs-extra";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import rimraf from 'rimraf';
import { installLocalPackages, installNodeModules } from "../shared/prepare";
import { LOCAL_UPSCALER_NAME } from "./constants";

const ROOT = path.join(__dirname);
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const prepareScriptBundleForNodeCJS = async () => {
  await installNodeModules(ROOT);
  await installLocalPackages(NODE_MODULES, [
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
  const hash = crypto.createHash('md5').update(contents).digest('hex');
  const FILENAME = path.resolve(TMP, `${hash}.js`);
  fs.writeFileSync(FILENAME, contents, 'utf-8');

  await callExec(`node "${FILENAME}"`, {
    cwd: ROOT
  }, stdout);

  rimraf.sync(TMP);
};
