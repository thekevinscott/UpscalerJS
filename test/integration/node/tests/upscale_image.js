const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('upscaler/node');
const path = require('path');
const fs = require('fs');
const base64ArrayBuffer = require('../../../lib/utils/base64ArrayBuffer')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const MODEL_PATH = path.join(FIXTURES, 'pixelator/pixelator.json');
const IMG = path.join(FIXTURES, 'flower-small.png');
const argv = yargs(hideBin(process.argv)).argv;

// Returns a PNG-encoded UInt8Array
const upscaleImageToUInt8Array = async (model, filename) => {
  const upscaler = new Upscaler({
    model,
    scale: 4,
  });
  const file = fs.readFileSync(filename)
  const image = tf.node.decodeImage(file, 3)
  return await upscaler.upscale(image, {
    output: 'tensor',
    patchSize: 64,
    padding: 6
  });
}

const main = async (model) => {
  const tensor = await upscaleImageToUInt8Array(model, IMG);
  const upscaledImage = await tf.node.encodePng(tensor)
  return base64ArrayBuffer(upscaledImage);
}

const getModelPath = () => {
  if (argv.useTfIOFileSystem) {
    return tf.io.fileSystem(MODEL_PATH);
  }
  return `file://${path.resolve(MODEL_PATH)}`;
}

(async () => {
  const data = await main(getModelPath());
  console.log(`data:image/png;base64,${data}`);
})();
