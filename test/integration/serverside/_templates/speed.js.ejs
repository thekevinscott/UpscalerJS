async function() {
  const Upscaler = require('<%- upscaler %>');
  const tf = require('<%- tf %>');
  const model = require('<%- model %>');
  const FLOWER_SIZE = 16;
  const patchSize = <%- patchSize %>;

  const upscaler = new Upscaler({
    model,
  });
  const bytes = new Uint8Array(JSON.parse(fs.readFileSync('<%- flowerPath %>')));
  let timesToRun = Math.ceil(FLOWER_SIZE / patchSize);
  timesToRun *= timesToRun;
  const input = tf.tensor(bytes).reshape([FLOWER_SIZE, FLOWER_SIZE, 3]);
  const time = async fn => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    if (result) {
      result.dispose();
    }
    return duration;
  };

  const [{ model: loadedModel }] = await Promise.all([
    upscaler.getModel(),
    upscaler.warmup({
      patchSize,
      padding: 0,
    }),
  ]);
  let rawDurations = 0;
  let upscalerJSDurations = 0;
  const TIMES = 7;
  for (let i = 0; i < TIMES; i++) {
    rawDurations = (await time(async () => {
      tf.tidy(() => {
        for (let i = 0; i < timesToRun; i++) {
          loadedModel.predict(input.expandDims(0));
        }
      });
    })) / TIMES;
    upscalerJSDurations = (await time(async () => await upscaler.execute(input, { output: 'tensor', patchSize, padding: 0 }))) / TIMES;
  }

  input.dispose();

  return JSON.stringify([rawDurations, upscalerJSDurations]);
};
