const express = require("express");
const path = require('path');
const fs = require('fs');
const Upscaler = require('upscaler/node');
const tf = require('@tensorflow/tfjs-node');

const app = express();

app.get("/", async (req, res) => {
  const upscaledImage = await getUpscaledImage();
  res.set('Content-Type', 'image/png');
  res.write(upscaledImage, 'binary');
  res.end(null, 'binary');
});

app.listen(8080);

// Returns a PNG-encoded UInt8Array
const upscaleImageToUInt8Array = async (image) => {
  const upscaler = new Upscaler();
  return await upscaler.upscale(image, {
    output: 'tensor',
    patchSize: 64,
    padding: 6
  });
}

const getUpscaledImage = async () => {
  const file = fs.readFileSync(path.resolve(__dirname, './flower-small.png'));
  const image = tf.node.decodeImage(file, 3);
  const upscaler = new Upscaler();
  const tensor = await upscaler.upscale(image, {
    output: 'tensor',
    patchSize: 64,
    padding: 6
  });
  image.dispose();
  const upscaledTensor = await tf.node.encodePng(tensor);
  tensor.dispose();
  return upscaledTensor;
}
