async function() {
  const Upscaler = require('upscaler/node');
  const tf = require('<%- tf %>');
  const imagePath = '<%- fixturePath %>';
  const model = require('<%- customModel %>');
  const usePatchSize = false;
  console.log('Running main script with model', JSON.stringify(model, null, 2));

  const upscaler = new Upscaler({
    model,
  });

  const imageData = fs.readFileSync(imagePath);
  const tensor = tf.node.decodeImage(imageData).slice([0, 0, 0], [-1, -1, 3]); // discard alpha channel, if exists
  const result = await upscaler.execute(tensor, {
    output: 'tensor',
    patchSize: usePatchSize ? 64 : undefined,
    padding: 6,
    progress: console.log,
  });
  tensor.dispose();

  // because we are requesting a tensor, it is possible that the tensor will
  // contain out-of-bounds pixels; part of the value of this test is ensuring
  // that those values are clipped in a post-process step.
  const upscaledImage = await tf.node.encodePng(result);
  result.dispose();
  return base64ArrayBuffer(upscaledImage);
}
