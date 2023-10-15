async function() {
  const Upscaler = require('<%- upscaler %>');
  const tf = require('<%- tf %>');
  const image = <%- image %>;
  const model = <%- model %>;

  const upscaler = new Upscaler({
    model,
  });

  const imageData = fs.readFileSync(image);
  const tensor = tf.node.decodeImage(imageData).slice([0, 0, 0], [-1, -1, 3]); // discard alpha channel, if exists
  const result = await upscaler.execute(tensor, {
    output: 'tensor',
  });
  tensor.dispose();

  // because we are requesting a tensor, it is possible that the tensor will
  // contain out-of-bounds pixels; part of the value of this test is ensuring
  // that those values are clipped in a post-process step.
  const upscaledImage = await tf.node.encodePng(result);
  result.dispose();
  return base64ArrayBuffer(upscaledImage);
}
