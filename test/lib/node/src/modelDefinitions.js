const Upscaler = require('upscaler-for-node/node');

(async () => {
  const upscaler = new Upscaler();
  const data = await upscaler.getModelDefinitions();
  console.log(`OUTPUT: ${JSON.stringify(data)}`);
})();
