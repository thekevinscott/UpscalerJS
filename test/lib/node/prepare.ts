import fs from 'fs';
import path from 'path';
import { DependencyDefinition, installLocalPackages, installNodeModules } from "../shared/prepare";
import { LOCAL_UPSCALER_NAMESPACE, LOCAL_UPSCALER_NAME } from "./constants";
import { getAllAvailableModelPackages } from "../../../scripts/package-scripts/utils/getAllAvailableModels";
import { withTmpDir } from "../../../scripts/package-scripts/utils/withTmpDir";
import { getHashedName } from "../../../scripts/package-scripts/utils/getHashedName";
import { Bundle } from "../../integration/utils/NodeTestRunner";
import { MODELS_DIR, UPSCALER_DIR } from "../../../scripts/package-scripts/utils/constants";
import validateBuild, { extractAllFilesFromPackageJSON } from "../../../scripts/package-scripts/validate-build";
import callExec, { StdErr, StdOut } from '../utils/callExec';

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
      console.log('Installing node modules');
    }
    await installNodeModules(NODE_ROOT, { verbose });
  }
  if (skipInstallLocalPackages !== true) {
    if (verbose) {
      console.log('Installing local packages');
    }
    await installLocalPackages(NODE_ROOT, [
      {
        src: UPSCALER_DIR,
        name: LOCAL_UPSCALER_NAME,
        callback: async ({ moduleFolder }) => {
          const expectedFiles = extractAllFilesFromPackageJSON(moduleFolder).filter(file => file.includes('node'));
          await validateBuild(moduleFolder, expectedFiles, { includeFilesFromPackageJSON: false });
          console.log(`successfully built upscaler in ${moduleFolder}`);
        },
      },
      ...getAllAvailableModelPackages().map((packageName): DependencyDefinition => {
        const modelsFolder = path.resolve(MODELS_DIR, packageName, 'models');
        const modelFiles = fs.readdirSync(modelsFolder);
        if (modelFiles.length === 0) {
          throw new Error(`No model files found in folder ${modelsFolder}. Did you call dvc pull for ${packageName}?`);
        }
        return {
          src: path.resolve(MODELS_DIR, packageName),
          name: path.join(LOCAL_UPSCALER_NAMESPACE, packageName),
          callback: async ({ moduleFolder }) => {
            const expectedFiles = extractAllFilesFromPackageJSON(moduleFolder).filter(file => file.includes('node'));
            await validateBuild(moduleFolder, expectedFiles, { includeFilesFromPackageJSON: false });
            console.log(`successfully built ${packageName} in ${moduleFolder}`);
          },
        };
      }),
    ], { 
      verbose,
      usePNPM,
     });
  }
};

const formatTestName = (testName: string) => testName.replace(/[\W_]+/g,"-");

const getTestName = (testName: string | undefined, contents: string) => {
  return `${testName ? formatTestName(testName) : getHashedName(contents)}.js`;
}

interface ExecuteNodeScriptOpts {
  stdout?: StdOut;
  stderr?: StdErr;
  verbose?: boolean;
}
type ExecuteNodeScript = (fileName: string, opts?: ExecuteNodeScriptOpts) => Promise<void>;
export const executeNodeScript: ExecuteNodeScript = async (fileName: string, { verbose, stdout, stderr } = {}) => {
  await callExec(`node "${fileName}"`, {
    cwd: NODE_ROOT,
    env: {
      // Hide warnings about TFJS not being compiled to use AXA on the CPU 
      TF_CPP_MIN_LOG_LEVEL: '3',
    },
    verbose,
  }, stdout, stderr);
};

export type GetScriptContents = (outputFile: string) => string;
interface TestNodeScriptOpts {
  logExtra?: boolean;
  removeTmpDir?: boolean;
  testName?: string;
  rootDir?: string;
  verbose?: boolean;
  logStderr?: boolean;
}
type RunNodeScript = (getScriptContents: GetScriptContents, opts?: TestNodeScriptOpts) => Promise<Buffer | undefined>;
export const runNodeScript: RunNodeScript = async (getScriptContents, {
  removeTmpDir,
  testName,
  rootDir = path.resolve(NODE_ROOT, './tmp'),
  verbose = false,
} = {}) => {
  let data: undefined | Buffer;
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
        if (verbose) {
          console.log('[PAGE]', chunk);
        }
      },
      verbose,
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
