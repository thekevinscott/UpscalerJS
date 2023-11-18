const upscaler = new window['Upscaler']({
  model: {
    ...window['DefaultUpscalerJSModel'],
    path: '/node_modules/upscaler/node_modules/@upscalerjs/default-model/models/model.json',
  },
});

import flower from '../flower-small.png';
upscaler.upscale(flower).then(console.log);
