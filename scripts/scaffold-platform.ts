const fs = require('fs');
const path = require('path');

const AVAILABLE_DEPENDENCIES = [
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
];

type Dependency = '@tensorflow/tfjs' | '@tensorflow/tfjs-node' | '@tensorflow/tfjs-node-gpu';

const isDependency = (dep?: string): dep is Dependency => {
  return dep !== undefined && AVAILABLE_DEPENDENCIES.includes(dep);
}

const getDependency = (dependency?: string) => {
  if (isDependency(dependency)) {
    return dependency;
  }

  throw new Error(`No valid dependency specified, please specify one of ${AVAILABLE_DEPENDENCIES.join(', ')}. You specified: ${dependency}`);
}

const dependency = getDependency(process.argv.pop());

const writeFile = (filename: string, content: string) => {
  const outputPath = path.resolve(__dirname, `../packages/upscalerjs/src/${filename}`);
  fs.writeFileSync(outputPath, content);
};

writeFile('./dependencies.generated.ts', `
export * as tf from '${dependency}';
export { default as fetch } from 'cross-fetch';
`);
