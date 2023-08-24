async function() {
  const Upscaler = require('<%- upscaler %>');
  const tf = require('<%- tf %>');
  const model = require('@upscalerjs/pixel-upsampler/4x');

  const upscaler = new Upscaler({
    model,
  });

  const bytes = new Uint8Array(JSON.parse(fs.readFileSync('<%- flower %>')));
  const tensor = tf.tensor(bytes).reshape([16, 16, 3]);
  const result = await upscaler.execute(tensor, {
    output: 'tensor',
    patchSize: 64,
    padding: 6,
  });

  // because we are requesting a tensor, it is possible that the tensor will
  // contain out-of-bounds pixels; part of the value of this test is ensuring
  // that those values are clipped in a post-process step.
  const upscaledImage = await tf.node.encodePng(result);
  result.dispose();
  return base64ArrayBuffer(upscaledImage);
}
