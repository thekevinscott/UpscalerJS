// import inquirer from 'inquirer';
import path from 'path';
import buildUpscaler from '../../lib/package-scripts/build-upscaler.js';
import { RegisterCommand } from '../../types.js';
import { EXAMPLES_DIR, isValidGuide } from '../../lib/guides/isValidGuide.js';
import { findSimilarFiles } from '../../lib/utils/findSimilarFiles.js';
import fsExtra from "fs-extra";
import { spawn, exec } from 'child_process';
const { readFile, readdir, stat } = fsExtra;

interface Options {
  verbose?: boolean;
  skipUpscalerBuild?: boolean;
}

const getAllDirectories = async (rootDir: string) => {
  const directories: string[] = [];
  const files = await readdir(rootDir);
  await Promise.all(files.map(async file => {
    const stats = await stat(path.resolve(rootDir, file));
    if (stats.isDirectory()) {
      directories.push(file);
    }
  }));
  return files;
};

type Platform = 'browser' | 'node' | 'node-gpu';

const getPlatform = async (examplePath: string): Promise<Platform> => {
  const packageJSON = JSON.parse(await readFile(path.resolve(examplePath, 'package.json'), 'utf8'));
  const deps = Object.keys(packageJSON.dependencies);
  if (deps.includes('@tensorflow/tfjs')) {
    return 'browser';
  } else if (deps.includes('@tensorflow/tfjs-node')) {
    return 'node';
  } else if (deps.includes('@tensorflow/tfjs-node-gpu')) {
    return 'node-gpu';
  }

  throw new Error('Could not determine valid TFJS dependency in example package.json')
};

const pluralize = (items: string[], separator = 'or'): string => {
  if (items.length === 0) {
    throw new Error('Must provide at least one item to pluralize');
  }
  if (items.length <= 2) {
    return items.join(` ${separator} `);
  }

  return `${items.slice(0, -1).join(', ')}, ${separator} ${items[items.length - 1]}`;
};

const startGuide = async (guide: string, { verbose, skipUpscalerBuild, }: Options) => {
  if (!await isValidGuide(guide)) {
    const examples = await getAllDirectories(EXAMPLES_DIR);
    const similarFiles = await findSimilarFiles(examples, guide, { n: 3, distance: 5 });

    throw new Error([
      `"${guide}" is not a valid guide, and was not found in the examples directory.`,
      similarFiles.length > 0 ? `Did you mean ${pluralize(similarFiles)}?` : undefined,
    ].filter(Boolean).join(' '));
  }

  const guidePath = path.resolve(EXAMPLES_DIR, guide);

  // get package name from directory
  const platform = await getPlatform(guidePath);

  if (skipUpscalerBuild !== true) {
    await buildUpscaler(platform);
    if (verbose) {
      console.log(`** built upscaler: ${platform}`)
    }
  }

  const npmInstall = exec('npm install --no-package-lock');
  npmInstall.on('close', (_code) => {
    spawn("npm", ['run', 'dev'], {
      shell: true,
      cwd: guidePath,
      stdio: "inherit"
    });
  });
}

export const registerGuideStart: RegisterCommand = (program) => {
  program.command('start')
    .description('Start an example')
    .argument('<string>', 'example to start')
    .option('--skipUpscalerBuild', 'if true, skip building UpscalerJS when starting up')
    .option('--verbose', 'verbose mode')
    .action(async (guide, options) => {
      console.log(`Starting guide: "${guide}"`);
      await startGuide(guide, options);
    });
};


