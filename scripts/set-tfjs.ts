const fs = require('fs');
const path = require('path');

const dependency = process.argv.pop();

const AVAILABLE_DEPENDENCIES = [
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
];

if (!AVAILABLE_DEPENDENCIES.includes(dependency)) {
  throw new Error(`No valid dependency specified, please specify one of ${AVAILABLE_DEPENDENCIES.join(', ')}. You specified: ${dependency}`);
}

const writeFile = (filename: string, content: string) => {
  const outputPath = path.resolve(__dirname, `../packages/upscalerjs/src/${filename}`);
  fs.writeFileSync(outputPath, content);
}

writeFile('tfjs.generated.ts', `export * from '${dependency}';`);
