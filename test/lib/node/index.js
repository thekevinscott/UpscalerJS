const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const Upscaler = require('upscaler').default;
const base64ArrayBuffer = require('./base64ArrayBuffer')

// Returns a PNG-encoded UInt8Array
const upscaleImageToUInt8Array = async (filename, upscaler, progress) => {
  const file = fs.readFileSync(filename)
  const image = tf.node.decodeImage(file, 3)
  const options = { output: 'tensor', patchSize: 64, padding: 6, progress }
  return await upscaler.upscale(image, options)
}

(async () => {
  const upscaler = new Upscaler();
  const filename = './flower-small.png';
  const tensor = await upscaleImageToUInt8Array(filename, upscaler);
  const upscaledImage = await tf.node.encodePng(tensor)
  console.log(base64ArrayBuffer(upscaledImage))
})();
