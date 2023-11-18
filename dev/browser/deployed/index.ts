const upscaler = new window['Upscaler']({
  model: window['DefaultUpscalerJSModel'],
})

import flower from './flower-small.png';
upscaler.upscale(flower).then(console.log);

