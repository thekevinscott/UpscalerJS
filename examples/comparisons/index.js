import Upscaler from 'upscaler';
import img from './flower.png';
const target = document.getElementById('target');

const upscaler = new Upscaler({
  model: 'div2k-2x',
});
upscaler.upscale(img).then((upscaledImgSrc) => {
  const img = document.createElement('img');
  img.src = upscaledImgSrc;
  target.innerHTML = '';
  target.appendChild(img);
});
