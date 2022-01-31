const fs = require('fs');
const path = require('path');

const AVAILABLE_DEPENDENCIES = [
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
];

type Platform = 'browser' | 'node' | 'node-gpu';

type Dependency = '@tensorflow/tfjs' | '@tensorflow/tfjs-node' | '@tensorflow/tfjs-node-gpu';

const isPlatform = (platform?: string): platform is Platform => {
  return platform !== undefined && ['browser', 'node', 'node-gpu'].includes(platform);
}

const getPlatform = (platform?: string): Platform => {
  if (isPlatform(platform)) {
    return platform;
  }

  throw new Error(`No valid platform specified, please specify one of ${AVAILABLE_DEPENDENCIES.join(', ')}. You specified: ${platform}`);
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

const getAdditionalDependencies = (platform: Platform) => {
  if (platform === 'browser') {
    return '';
  }

  return `import 'isomorphic-fetch';`;
}

const platform = getPlatform(process.argv.pop());
const dependency = getDependency(platform);

const writeFile = (filename: string, content: string) => {
  const outputPath = path.resolve(__dirname, `../packages/upscalerjs/src/${filename}`);
  fs.writeFileSync(outputPath, content);
};

writeFile('./dependencies.generated.ts', `
export * as tf from '${dependency}';
${getAdditionalDependencies(platform)}
`);
