const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('upscaler/node');
const path = require('path');
const fs = require('fs');
const base64ArrayBuffer = require('../../utils/base64ArrayBuffer')

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const MODEL_PATH = path.join(FIXTURES, 'pixelator/pixelator.json');
const IMG = path.join(FIXTURES, 'flower-small.png');

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
  return `file://${path.resolve(MODEL_PATH)}`;
}

(async () => {
  const data = await main(getModelPath());
  console.log(`OUTPUT: ${data}`);
})();

// const express = require("express");
// const path = require('path');
// const fs = require('fs');
// const Upscaler = require('upscaler/node');
// const tf = require('@tensorflow/tfjs-node');

// const app = express();


// app.get("/", async (req, res) => {
//   const upscaledImage = await getUpscaledImage();
//   res.set('Content-Type', 'image/png');
//   res.write(upscaledImage, 'binary');
//   res.end(null, 'binary');
// });

// app.listen(8080);

// const getUpscaledImage = async () => {
//   const file = fs.readFileSync(path.resolve(__dirname, './flower-small.png'));
//   const image = tf.node.decodeImage(file, 3);
//   const upscaler = new Upscaler();
//   const tensor = await upscaler.upscale(image, {
//     output: 'tensor',
//     patchSize: 64,
//     padding: 6
//   });
//   image.dispose();
//   const upscaledTensor = await tf.node.encodePng(tensor);
//   tensor.dispose();
//   return upscaledTensor;
// }
