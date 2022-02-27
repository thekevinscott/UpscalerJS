const express = require("express");
const path = require('path');
const fs = require('fs');
const Upscaler = require('upscaler/node');
const tf = require('@tensorflow/tfjs-node');

const app = express();

const upscaler = new Upscaler({
  model: tf.io.fileSystem(path.resolve(__dirname, '../node_modules/@upscalerjs/models/models/div2k/005-2x/model.json')),
  scale: 2,
});

app.get("/", async (req, res) => {
  const upscaledImage = await getUpscaledImage();
  res.set('Content-Type', 'image/png');
  res.write(upscaledImage, 'binary');
  res.end(null, 'binary');
});

app.listen(8080);

const getUpscaledImage = async () => {
  const file = fs.readFileSync(path.resolve(__dirname, './flower-small.png'));
  const image = tf.node.decodeImage(file, 3);
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
