import Upscaler from 'upscaler';
const upscaler = new Upscaler();

upscaler.dispose().then(() => {
  console.log('UpscalerJS is cleaned up')
});
