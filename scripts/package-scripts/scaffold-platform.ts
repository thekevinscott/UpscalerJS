import yargs from 'yargs';
import fs from 'fs';
import path from 'path';

export type Platform = 'browser' | 'node' | 'node-gpu';

export type Dependency = '@tensorflow/tfjs' | '@tensorflow/tfjs-node' | '@tensorflow/tfjs-node-gpu';

const AVAILABLE_TENSORFLOW_PACKAGES = [
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
];

const ROOT = path.resolve(__dirname, `../..`);

const writeFile = (filename: string, content: string) => fs.writeFileSync(filename, content);

interface Args {
  targetPackage: string;
  platform: Platform;
}

const isPlatform = (platform?: string | number): platform is Platform => typeof platform === 'string' && ['browser', 'node', 'node-gpu'].includes(platform);

const getPlatform = (platform?: string | number): Platform => {
  if (isPlatform(platform)) {
    return platform;
  }

  throw new Error(`No valid platform specified, please specify one of ${AVAILABLE_TENSORFLOW_PACKAGES.join(', ')}. You specified: ${platform}`);
}

const getArgs = async (): Promise<Args> => {
  const argv = await yargs.command('scaffold-platform <src> [platform]', 'scaffold dependencies for a specific platform', yargs => {
    yargs.positional('platform', {
      describe: 'The platform to target',
    }).options({
      src: { type: 'string', demandOption: true },
    });
  })
  .help()
  .argv;

  if (typeof argv.src !== 'string') {
    throw new Error(`Invalid src, should be a string: ${argv.src}`);
  }

  return {
    targetPackage: argv.src,
    platform: getPlatform(argv['_'][0])
  }
}

const getDependency = (platform: Platform): Dependency => {
  if (platform === 'node') {
    return '@tensorflow/tfjs-node';
  }
  if (platform === 'node-gpu') {
    return '@tensorflow/tfjs-node-gpu';
  }
  return '@tensorflow/tfjs';
}

const writeLines = (filename: string, content: Array<string>) => writeFile(filename, `${content.map(l => l.trim()).join('\n')}\n`);

const findPlatformSpecificFiles = (folder: string) => new Set(fs.readdirSync(folder).filter(file => {
  return /(.*).(browser|node).ts$/.test(file)
}).map(file => file.split('.').slice(0, -2).join('.')));

const getFilePath = (file: string, platform: Platform) => `${file}.${platform === 'browser' ? 'browser' : 'node'}.ts`;

const scaffoldPlatformSpecificFile = (src: string, file: string, platform: Platform) => {
  const srcFile = path.resolve(src, getFilePath(file, platform));
  if (!fs.existsSync(srcFile)) {
    throw new Error(`File ${srcFile} does not exist`)
  }
  const targetFile = path.resolve(src, `${file}.generated.ts`);
  try { fs.unlinkSync(targetFile); } catch(err) {}
  fs.symlinkSync(srcFile, targetFile, 'file');
};

const scaffoldPlatformSpecificFiles = (folder: string, platform: Platform) => {
  const files = findPlatformSpecificFiles(folder);
  files.forEach(file => scaffoldPlatformSpecificFile(folder, file, platform));
}

const scaffoldPlatform = async (platform: Platform, targetPackage: string) => {
  const srcFolder = path.resolve(ROOT, targetPackage, 'src');
  const isUpscaler = targetPackage === 'packages/upscalerjs';
  const dependency = getDependency(platform);

  if (isUpscaler) {
    writeLines(path.resolve(srcFolder, './dependencies.generated.ts'), [
      `export * as tf from '${dependency}';`,
      `export ESRGANSlim from '@upscalerjs/esrgan-slim${platform === 'node' ? '/node' : platform === 'node-gpu' ? '/node-gpu' : ''}';`,
    ]);
  } else {
    writeLines(path.resolve(srcFolder, './dependencies.generated.ts'), [
      `export * as tf from '${dependency}';`,
      // `export * as tfcore from '@tensorflow/tfjs-core';`,
      // `export * as tflayers from '@tensorflow/tfjs-layers';`,
    ]);
    const { name, version } = JSON.parse(fs.readFileSync(path.resolve(srcFolder, '../package.json'), 'utf8'));
    writeLines(path.resolve(srcFolder, './constants.generated.ts'), [
      `export const NAME = "${name}";`,
      `export const VERSION = "${version}";`,
    ]);
  }

  scaffoldPlatformSpecificFiles(srcFolder, platform);
};

export default scaffoldPlatform;

if (require.main === module) {
  (async () => {
    const argv = await getArgs();
    const platform = getPlatform(process.argv.pop());
    await scaffoldPlatform(platform, argv.targetPackage);
  })();
}
