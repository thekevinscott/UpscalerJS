import Upscaler from 'upscaler';
import img from './flower.png';
const target = document.getElementById('target');

const upscaler = new Upscaler();
upscaler.upscale(img).then((upscaledImgSrc) => {
  const img = document.createElement('img');
  img.src = upscaledImgSrc;
  target.innerHTML = '';
  target.appendChild(img);
});
