import Upscaler from 'upscaler';
import img from './flower.png';
const target = document.getElementById('target');
const button = document.getElementById('button');
const info = document.getElementById('info');

const upscaler = new Upscaler({
  warmupSizes: [[128, 128]],
});
button.onclick = () => {
  info.innerText = 'Upscaling...';
  const start = new Date().getTime();
  upscaler.upscale(img).then((upscaledImgSrc) => {
    const img = document.createElement('img');
    img.src = upscaledImgSrc;
    target.innerHTML = '';
    target.appendChild(img);
    const ms = new Date().getTime() - start;
    info.innerText = `Upscaled in ${ms} ms`;
  });
};
