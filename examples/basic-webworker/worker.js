import Upscaler from 'upscaler';
let upscaler;

onmessage = (e) => {
  console.log(e.data);
  if (!upscaler) {
    upscaler = new Upscaler({
      model: 'psnr_small',
    });
  }
  upscaler.upscale(e.data).then((upscaledImgSrc) => {
    postMessage(upscaledImgSrc);
  });
}
