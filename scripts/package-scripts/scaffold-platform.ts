import yargs from 'yargs';
import fs from 'fs';
import path from 'path';

export type Platform = 'browser' | 'node' | 'node-gpu';

export type Dependency = '@tensorflow/tfjs' | '@tensorflow/tfjs-node' | '@tensorflow/tfjs-node-gpu';

const AVAILABLE_DEPENDENCIES = [
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
];

const ROOT = path.resolve(__dirname, `../..`);

const writeFile = (filename: string, content: string) => fs.writeFileSync(filename, content);

interface Args {
  src: Array<string>;
  platform: Platform;
}

const isPlatform = (platform?: string | number): platform is Platform => typeof platform === 'string' && ['browser', 'node', 'node-gpu'].includes(platform);

const getPlatform = (platform?: string | number): Platform => {
  if (isPlatform(platform)) {
    return platform;
  }

  throw new Error(`No valid platform specified, please specify one of ${AVAILABLE_DEPENDENCIES.join(', ')}. You specified: ${platform}`);
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

  let src: Array<string> = [];
  if (typeof argv.src === 'string') {
    src.push(argv.src);
  } else {
    src = src.concat(argv.src as Array<string>);
  }
  // const src: Array<string> = [].concat(argv.src as string | Array<string>);
  // console.log(src);
  // if (typeof src !== 'string') {
  //   throw new Error('Invalid src provided');
  // }

  return {
    src,
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

const scaffoldPlatform = async (platform: Platform, srcs: Array<string>) => {
// const scaffoldPlatform = async (platform: Platform, srcFolder: string, isUpscaler: boolean = false) => {
  for (let i = 0; i < srcs.length; i++) {
    const src = srcs[i];
    const srcFolder = path.resolve(ROOT, srcs[i]);
    const isUpscaler = src === 'packages/upscalerjs/src';
    const dependency = getDependency(platform);

    writeLines(path.resolve(srcFolder, './dependencies.generated.ts'), [
      `export * as tf from '${dependency}';`,
    ]);

    if (!isUpscaler) {
      const { name, version } = JSON.parse(fs.readFileSync(path.resolve(srcFolder, '../package.json'), 'utf8'));
      writeLines(path.resolve(srcFolder, './constants.generated.ts'), [
        `export const NAME = "${name}";`,
        `export const VERSION = "${version}";`,
      ]);
    }

    scaffoldPlatformSpecificFiles(srcFolder, platform);
  }
}

export default scaffoldPlatform;

if (require.main === module) {
  (async () => {
    const argv = await getArgs();
    const platform = getPlatform(process.argv.pop());
    await scaffoldPlatform(platform, argv.src);
  })();
}
