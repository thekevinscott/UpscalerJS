const Upscaler = require('upscaler/node');

(async () => {
  const upscaler = new Upscaler();
  const data = await upscaler.getModelDefinitions();
  console.log(`OUTPUT: ${JSON.stringify(data)}`);
})();
