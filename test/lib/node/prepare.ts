import callExec from "../utils/callExec";
import fs from 'fs';
import path from 'path';
import { installLocalPackages, installNodeModules } from "../shared/prepare";
import { LOCAL_UPSCALER_NAMESPACE, LOCAL_UPSCALER_NAME } from "./constants";
import { getAllAvailableModelPackages } from "../../../scripts/package-scripts/utils/getAllAvailableModels";
import { getHashedName, withTmpDir } from "../../../scripts/package-scripts/utils/withTmpDir";

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

const formatTestName = (testName: string) => testName.replace(/[\W_]+/g,"-");

const getTestName = (testName: string | undefined, contents: string) => {
  return `${testName ? formatTestName(testName) : getHashedName(contents)}.js`;
}

interface ExecuteNodeScriptOpts {
  stdout?: Stdout;
}
type ExecuteNodeScript = (fileName: string, opts?: ExecuteNodeScriptOpts) => Promise<void>;
export const executeNodeScript: ExecuteNodeScript = async (fileName: string, { stdout } = {}) => {
  await callExec(`node "${fileName}"`, {
    cwd: ROOT
  }, stdout);
};

export type GetScriptContents = (outputFile: string) => string;
interface TestNodeScriptOpts {
  logExtra?: boolean;
  removeTmpDir?: boolean;
  testName?: string;
}
type TestNodeScript = (getScriptContents: GetScriptContents, opts?: TestNodeScriptOpts) => Promise<Buffer | undefined>;
export const testNodeScript: TestNodeScript = async (getScriptContents, {
  logExtra = true,
  removeTmpDir,
  testName,
} = {}) => {
  let data;
  await withTmpDir(async tmpDir => {
    const dataFile = path.join(tmpDir, getHashedName(`${Math.random()}`));
    const contentOutput = getScriptContents(dataFile).trim();
    const fileName = path.resolve(tmpDir, getTestName(testName, contentOutput));
    fs.writeFileSync(fileName, contentOutput, 'utf-8');
    await executeNodeScript(fileName, {
      stdout: chunk => {
        if (logExtra) {
          console.log('[PAGE]', chunk);
        }
      },
    });
    data = fs.readFileSync(dataFile);
  }, {
    rootDir: path.resolve(ROOT, './tmp'),
    removeTmpDir,
  });
  return data;
}
