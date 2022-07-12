import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { getPackageJSON } from './utils/packages';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

/****
 * Type Definitions
 */
export type Platform = 'browser' | 'node' | 'node-gpu';

export type TFJSDependency = '@tensorflow/tfjs' | '@tensorflow/tfjs-node' | '@tensorflow/tfjs-node-gpu';

type ContentFn = (arg: {
  tfjs?: TFJSDependency;
  platform?: Platform;
  packageJSON: JSONSchemaForNPMPackageJsonFiles;
}) => string;
type Content = string | ContentFn;
interface File {
  name: string;
  contents: Content[];
}

export interface ScaffoldDependenciesConfig {
  scaffoldPlatformFiles?: boolean;
  files: File[];
}

/****
 * Constants
 */
const ROOT = path.resolve(__dirname, `../..`);

/****
 * Dependency-specific utility functions
 */
export const writeTFJSDependency: ContentFn = ({ tfjs, }) => {
  if (tfjs === undefined) {
    throw new Error('TFJS Platform was undefined');
  }
  return `export * as tf from '${tfjs}';`;
};

export const getPlatformSpecificTensorflow = (platform?: Platform): TFJSDependency | undefined => {
  if (platform === undefined) {
    return undefined;
  }
  if (platform === 'node') {
    return '@tensorflow/tfjs-node';
  }
  if (platform === 'node-gpu') {
    return '@tensorflow/tfjs-node-gpu';
  }
  return '@tensorflow/tfjs';
}

/****
 * File OS utility functions 
 */

const writeFile = (filename: string, content: string) => fs.writeFileSync(filename, content);

const writeLines = (filename: string, content: Array<string>) => writeFile(filename, `${content.map(l => l.trim()).join('\n')}\n`);

/****
 * Functions for scaffolding platform-specific files
 */
const getFilePath = (file: string, platform: Platform) => `${file}.${platform === 'browser' ? 'browser' : 'node'}.ts`;

const findPlatformSpecificFiles = (folder: string) => new Set(fs.readdirSync(folder).filter(file => {
  return /(.*).(browser|node).ts$/.test(file)
}).map(file => file.split('.').slice(0, -2).join('.')));


const scaffoldPlatformSpecificFiles = (folder: string, platform: Platform) => {
  const files = findPlatformSpecificFiles(folder);
  files.forEach(file => scaffoldPlatformSpecificFile(folder, file, platform));
}

const scaffoldPlatformSpecificFile = (src: string, file: string, platform: Platform) => {
  const srcFile = path.resolve(src, getFilePath(file, platform));
  if (!fs.existsSync(srcFile)) {
    throw new Error(`File ${srcFile} does not exist`)
  }
  const targetFile = path.resolve(src, `${file}.generated.ts`);
  try { fs.unlinkSync(targetFile); } catch(err) {}
  fs.symlinkSync(srcFile, targetFile, 'file');
};

/****
 * Utility methods
 */
function load(filePath: string): Promise<{
  default: ScaffoldDependenciesConfig
}> {
  return import(filePath);
}

/****
 * Main function
 */

const scaffoldDependencies = async (packageRoot: string, { files, scaffoldPlatformFiles, }: ScaffoldDependenciesConfig, platform?: Platform) => {
  const PACKAGE_ROOT = path.resolve(ROOT, packageRoot);
  const PACKAGE_SRC = path.resolve(PACKAGE_ROOT, 'src');
  if (scaffoldPlatformFiles) {
    if (!platform) {
      throw new Error('You must provide a platform to scaffold platform specific files');
    }
    scaffoldPlatformSpecificFiles(PACKAGE_SRC, platform);
  }
  const tfjs = getPlatformSpecificTensorflow(platform);
  const packageJSON = getPackageJSON(PACKAGE_ROOT);
  files.forEach(({ name, contents }) => {
    const filePath = path.resolve(PACKAGE_SRC, `${name}.generated.ts`);
    const lines = contents.map(line => typeof line === 'string' ? line : line({
      tfjs,
      packageJSON,
      platform,
    }));
    writeLines(filePath, lines);
  });
}

export default scaffoldDependencies;

/****
 * Functions to expose the main function as a CLI tool
 */

interface Args {
  targetPackage: string;
  platform?: Platform;
  config: string;
}

const isPlatform = (platform?: unknown): platform is Platform => typeof platform === 'string' && ['browser', 'node', 'node-gpu'].includes(platform);

const getPlatform = (platform?: unknown): Platform | undefined => {
  if (isPlatform(platform)) {
    return platform;
  }
}

const getArgs = async (): Promise<Args> => {
  const argv = await yargs.command('scaffold-dependencies <src> <config> [platform]', 'scaffold dependencies for a specific platform', yargs => {
    yargs.positional('platform', {
      describe: 'The platform to target',
    }).options({
      src: { type: 'string', demandOption: true },
      config: { type: 'string', demandOption: true },
    });
  })
  .help()
  .argv;

  if (typeof argv.src !== 'string') {
    throw new Error(`Invalid src, should be a string: ${argv.src}`);
  }

  if (typeof argv.config !== 'string') {
    throw new Error(`Invalid config, should be a string: ${argv.config}`);
  }

  return {
    targetPackage: argv.src,
    config: argv.config,
    platform: getPlatform(argv['_'][0]),
  }
}


if (require.main === module) {
  (async () => {
    const argv = await getArgs();
    const { default: config } = await load(path.resolve(ROOT, argv.config));
    await scaffoldDependencies(argv.targetPackage, config, argv.platform);
  })();
}
