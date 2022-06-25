import callExec from "../utils/callExec";
import { mkdirp } from "fs-extra";
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

const ROOT = path.join(__dirname);

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
};
