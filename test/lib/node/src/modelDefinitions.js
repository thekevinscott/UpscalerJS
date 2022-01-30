const Upscaler = require('upscaler/node');

(async () => {
  const upscaler = new Upscaler();
  const data = JSON.stringify(upscaler.getModelDefinitions());
  console.log(`OUTPUT: ${data}`);
})();
