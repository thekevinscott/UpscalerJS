const path = require('path');
const fs = require('fs');
const Upscaler = require('upscaler/node');
const tf = require('@tensorflow/tfjs-node');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

const FIXTURES = path.join(__dirname, '../../__fixtures__');

const getModel = (model) => {
  if (model === 'pixelator') {
    const model_path = path.join(FIXTURES, 'pixelator/pixelator.json');
    return {
      model: tf.io.fileSystem(model_path),
      scale: 4,
    };
  }
  return undefined;
}

const getArgs = () => {
  let args = {};
  if (argv.model) {
    args = {
      ...args,
      ...getModel(argv.model),
    };
  }

  return args;
}

const getUpscaledImage = async (image) => {
  const upscaler = new Upscaler(getArgs());
  // // const tensor = await upscaler.upscale(image, {
  // //   output: 'tensor',
  // // });
  // // tensor.dispose();
  // image.dispose();
}

(async () => {
  const file = fs.readFileSync(path.resolve(__dirname, './flower.png'));
  const image = tf.node.decodeImage(file, 3);
  for (let i = 0; i < argv.iterations; i++) {
    await getUpscaledImage(image);
    console.log(`rss: ${process.memoryUsage().rss} | ${i}`);
    global.gc();
  }
})();
