const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('upscaler-for-node/node');
throw new Error('FIX THIS DEFAULT');
const pixelUpsampler = require('@upscalerjs/pixel-upsampler/4x-3').default;
const path = require('path');
const fs = require('fs');
const base64ArrayBuffer = require('../../utils/base64ArrayBuffer')

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const IMG = path.join(FIXTURES, 'flower-small.png');

// Returns a PNG-encoded UInt8Array
const upscaleImageToUInt8Array = async (filename) => {
  const upscaler = new Upscaler({
    model: pixelUpsampler,
  });
  const file = fs.readFileSync(filename)
  const image = tf.node.decodeImage(file, 3)
  return await upscaler.upscale(image, {
    output: 'tensor',
    patchSize: 64,
    padding: 6
  });
}

const main = async () => {
  const tensor = await upscaleImageToUInt8Array(IMG);
  const upscaledImage = await tf.node.encodePng(tensor)
  return base64ArrayBuffer(upscaledImage);
}

(async () => {
  const data = await main();
  console.log(`OUTPUT: ${data}`);
})();
