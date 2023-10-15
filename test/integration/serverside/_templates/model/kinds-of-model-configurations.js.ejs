async function() {
  const Upscaler = require('<%- upscaler %>');
  const tf = require('<%- tf %>');
  const model = <%- model %>;
  const warnings = [];
  const imageInputSize = <%- imageInputSize %>;
  const scale = <%- scale %>;
  const patchSize = <%- patchSize %>;
  const padding = <%- padding %>;
  console.warn = (...msg) => warnings.push(msg);
  const MODEL_JSON_PATH = '<%- modelJSONPath %>';
  const WEIGHT_PATH = '<%- modelWeightPath %>';

  const upscaler = new Upscaler({
    model,
  });

  const tensor = tf.randomUniform([...imageInputSize, 3], 0, 1);
  const expectedTensor = tf.image.resizeNearestNeighbor(
    tensor,
    [imageInputSize[0] * scale, imageInputSize[1] * scale],
  );
  const progressResults = [];
  const progress = (amount, slice, { row, col }) => {
    progressResults.push({
      amount,
      row,
      col,
      shape: slice.shape,
    });
    slice.dispose();
  };
  const result = await upscaler.execute(tensor, {
    output: 'tensor',
    progressOutput: 'tensor',
    patchSize,
    padding,
    progress,
  });
  tensor.dispose();

  // because we are requesting a tensor, it is possible that the tensor will
  // contain out-of-bounds pixels; part of the value of this test is ensuring
  // that those values are clipped in a post-process step.

  const upscaledImage = [Array.from(result.dataSync()), result.shape];
  result.dispose();
  const expectedImage = [Array.from(expectedTensor.dataSync()), expectedTensor.shape];
  expectedTensor.dispose();

  return JSON.stringify({
    upscaledImage,
    expectedImage,
    progressResults,
    warnings,
  });
}
