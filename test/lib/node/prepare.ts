import callExec from "../utils/callExec";
import fs from 'fs';
import path from 'path';
import { installLocalPackages, installNodeModules } from "../shared/prepare";
import { LOCAL_UPSCALER_NAMESPACE, LOCAL_UPSCALER_NAME } from "./constants";
import { getAllAvailableModelPackages } from "../../../scripts/package-scripts/utils/getAllAvailableModels";
import { withTmpDir } from "../../../scripts/package-scripts/utils/withTmpDir";
import { getHashedName } from "../../../scripts/package-scripts/utils/getHashedName";
import { Bundle } from "../../integration/utils/NodeTestRunner";
import { MODELS_DIR, UPSCALER_DIR } from "../../../scripts/package-scripts/utils/constants";

/***
 * Types
 */
export interface BundleOpts {
  verbose?: boolean;
  skipInstallNodeModules?: boolean;
  skipInstallLocalPackages?: boolean;
  usePNPM?: boolean;
}

/***
 * Constants
 */
export const NODE_ROOT = path.join(__dirname);

/***
 * Functions
 */
export const prepareScriptBundleForNodeCJS: Bundle<BundleOpts> = async ({ 
  verbose = false, 
  skipInstallNodeModules = false, 
  skipInstallLocalPackages = false,
  usePNPM = false,
}: BundleOpts = {}) => {
  if (skipInstallNodeModules !== true) {
    if (verbose) {
      console.log('installing node modules');
    }
    await installNodeModules(NODE_ROOT, { verbose });
  }
  if (skipInstallLocalPackages !== true) {
    if (verbose) {
      console.log('installing local packages');
    }
    await installLocalPackages(NODE_ROOT, [
      {
        src: UPSCALER_DIR,
        name: LOCAL_UPSCALER_NAME,
      },
      ...getAllAvailableModelPackages().map(packageName => ({
        src: path.resolve(MODELS_DIR, packageName),
        name: path.join(LOCAL_UPSCALER_NAMESPACE, packageName),
      })),
    ], { 
      verbose,
      usePNPM,
     });
  }
};

type Stdout = (data: string) => void;
type Stderr = (data: string) => void;
export const executeNodeScriptFromFilePath = async (file: string, stdout?: Stdout) => {
  await callExec(`node "./src/${file}"`, {
    cwd: NODE_ROOT
  }, stdout);
};

const formatTestName = (testName: string) => testName.replace(/[\W_]+/g,"-");

const getTestName = (testName: string | undefined, contents: string) => {
  return `${testName ? formatTestName(testName) : getHashedName(contents)}.js`;
}

interface ExecuteNodeScriptOpts {
  stdout?: Stdout;
  stderr?: Stderr;
}
type ExecuteNodeScript = (fileName: string, opts?: ExecuteNodeScriptOpts) => Promise<void>;
export const executeNodeScript: ExecuteNodeScript = async (fileName: string, { stdout, stderr } = {}) => {
  await callExec(`node "${fileName}"`, {
    cwd: NODE_ROOT
  }, stdout, stderr);
};

export type GetScriptContents = (outputFile: string) => string;
interface TestNodeScriptOpts {
  logExtra?: boolean;
  removeTmpDir?: boolean;
  testName?: string;
  rootDir?: string;
}
type TestNodeScript = (getScriptContents: GetScriptContents, opts?: TestNodeScriptOpts) => Promise<Buffer | undefined>;
export const testNodeScript: TestNodeScript = async (getScriptContents, {
  logExtra = true,
  removeTmpDir,
  testName,
  rootDir = path.resolve(NODE_ROOT, './tmp'),
} = {}) => {
  let data;
  await withTmpDir(async tmpDir => {
    const dataFile = path.join(tmpDir, getHashedName(`${Math.random()}`));
    const contentOutput = getScriptContents(dataFile).trim();
    const fileName = path.resolve(tmpDir, getTestName(testName, contentOutput));
    fs.writeFileSync(fileName, contentOutput, 'utf-8');
    if (removeTmpDir === false) {
      console.log(`file is ${fileName}`);
    }
    await executeNodeScript(fileName, {
      stdout: chunk => {
        if (logExtra) {
          console.log('[PAGE]', chunk);
        }
      },
      stderr: chunk => {
        // if (logExtra) {
        //   console.log('[PAGE]', chunk);
        // }
      },
    });
    data = fs.readFileSync(dataFile);
    if (removeTmpDir === false) {
      console.log(`tmpDir is ${tmpDir}`);
    }
  }, {
    rootDir,
    removeTmpDir,
  });
  return data;
}
