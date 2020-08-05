import Upscaler from 'upscaler';
import img from './flower.png';
const target = document.getElementById('target');

const upscaler = new Upscaler({
  model: 'div2k/rdn-C3-D10-G64-G064-x2',
});
upscaler.upscale(img).then((upscaledImgSrc) => {
  const img = document.createElement('img');
  img.src = upscaledImgSrc;
  target.innerHTML = '';
  target.appendChild(img);
});
