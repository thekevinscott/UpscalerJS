const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('upscaler/node');
const path = require('path');
const fs = require('fs');
const base64ArrayBuffer = require('./base64ArrayBuffer')

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const IMG = path.join(FIXTURES, 'flower-small.png');
const MODEL = tf.io.fileSystem(path.join(FIXTURES, 'pixelator/pixelator.json'));

// Returns a PNG-encoded UInt8Array
const upscaleImageToUInt8Array = async (filename, progress) => {
  const upscaler = new Upscaler({
    model: MODEL,
    scale: 4,
  });
  const file = fs.readFileSync(filename)
  const image = tf.node.decodeImage(file, 3)
  const options = { output: 'tensor', patchSize: 64, padding: 6, progress }
  return await upscaler.upscale(image, options)
}

const main = async () => {
  const tensor = await upscaleImageToUInt8Array(IMG);
  const upscaledImage = await tf.node.encodePng(tensor)
  return base64ArrayBuffer(upscaledImage);
}

(async () => {
  const data = await main();
  console.log(`data:image/png;base64,${data}`);
})();

