import Upscaler from 'upscaler';
const target = document.getElementById('target');
const button = document.getElementById('button');

let upscaler;
button.onclick = () => {
  if (!upscaler) {
    upscaler = new Upscaler({
      model: 'psnr_small',
    });
  }
  upscaler.upscale('/flower.png').then((upscaledImgSrc) => {
    const img = document.createElement('img');
    console.log(upscaledImgSrc)
    img.src = upscaledImgSrc;
    target.appendChild(img);
  });
};
