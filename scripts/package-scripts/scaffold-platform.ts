import yargs from 'yargs';
// import yargs from 'yargs/yargs';
import * as fs from 'fs';
import * as path from 'path';

type Platform = 'browser' | 'node' | 'node-gpu';

type Dependency = '@tensorflow/tfjs' | '@tensorflow/tfjs-node' | '@tensorflow/tfjs-node-gpu';

const AVAILABLE_DEPENDENCIES = [
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
];

const ROOT = path.resolve(__dirname, `../..`);

const writeFile = (filename: string, content: string) => fs.writeFileSync(filename, content);

interface Args {
  src: string;
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

  const src = argv.src;
  if (typeof src !== 'string') {
    throw new Error('Invalid src provided');
  }

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

const scaffoldImageFile = (SRC: string, platform: Platform) => {
  const getImagePath = (platform: Platform) => {
    if (platform === 'browser') {
      return `image.browser.ts`;
    }

    return `image.node.ts`;
  }

  const imageContents = fs.readFileSync(path.resolve(SRC, getImagePath(platform)), 'utf-8');

  writeFile('./image.generated.ts', imageContents);
};

(async function main() {
  const argv = await getArgs();

  const SRC = path.resolve(ROOT, argv.src);

  const getAdditionalDependencies = (platform: Platform, src: string): Array<string> => {
    if (src !== 'packages/upscalerjs/src') {
      return [];
    }
    if (platform === 'browser') {
      return [];
    }

    return [
      `import 'isomorphic-fetch';`,
    ];
  }


  const platform = getPlatform(process.argv.pop());
  const dependency = getDependency(platform);


  writeLines(path.resolve(SRC, './dependencies.generated.ts'), [
    `export * as tf from '${dependency}';`,
    ...getAdditionalDependencies(platform, argv.src),
  ]);

  if (argv.src === 'packages/upscalerjs/src') {
    scaffoldImageFile(SRC, platform);
  }
})();
