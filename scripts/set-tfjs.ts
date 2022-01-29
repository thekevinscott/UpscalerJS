const fs = require('fs');
const path = require('path');

const dependency = process.argv.pop();

const FILENAME = 'tfjs.generated.ts';

const AVAILABLE_DEPENDENCIES = [
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
];

if (!AVAILABLE_DEPENDENCIES.includes(dependency)) {
  throw new Error(`No valid dependency specified, please specify one of ${AVAILABLE_DEPENDENCIES.join(', ')}. You specified: ${dependency}`);
}

const TFJS_OUTPUT_PATH = path.resolve(__dirname, `../packages/upscalerjs/src/${FILENAME}`);

const content = `export * from '${dependency}';`;

fs.writeFileSync(TFJS_OUTPUT_PATH, content);
