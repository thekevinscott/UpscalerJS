async function() {
  const Upscaler = require('<%- upscaler %>');
  const tf = require('<%- tf %>');
  const image = <%- image %>;
  const model = <% if (customModel !== 'undefined') { %>require('<%- customModel %>')<% } else { %>undefined<% } %>;

  const upscaler = new Upscaler({
    model,
  });

  const result = await upscaler.execute(image, {
    patchSize: <%- patchSize %>,
    padding: <%- padding %>,
  });

  // because we are requesting a tensor, it is possible that the tensor will
  // contain out-of-bounds pixels; part of the value of this test is ensuring
  // that those values are clipped in a post-process step.
  const upscaledImage = await tf.node.encodePng(result);
  result.dispose();
  return base64ArrayBuffer(upscaledImage);
}
