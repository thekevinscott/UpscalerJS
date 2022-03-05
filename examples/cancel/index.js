import Upscaler from 'upscaler';
import img from './flower.png';
const target = document.getElementById('target');
const upscale = document.getElementById('upscale');
const cancel = document.getElementById('cancel');
const info = document.getElementById('info');

let abortController = new AbortController();
const upscaler = new Upscaler();
upscale.onclick = () => {
  info.innerText = 'Upscaling...';
  const start = new Date().getTime();
  let rate = 0;
  upscaler.upscale(img, {
    patchSize: 16,
    padding: 4,
    signal: abortController.signal,
    progress: (inProgressRate) => {
      rate = inProgressRate.toFixed(2);
      info.innerText = `Upscaling (${rate}%)...`;
    },
  }).then((upscaledImgSrc) => {
    const img = document.createElement('img');
    img.src = upscaledImgSrc;
    target.innerHTML = '';
    target.appendChild(img);
    const ms = new Date().getTime() - start;
    info.innerText = `Upscaled in ${ms} ms`;
  }).catch(err => {
    console.log('The AbortError:', err);
    info.innerText = `Canceled at ${rate}%`;
  });
};

cancel.onclick = () => {
  console.log('canceled');
  abortController.abort();
  abortController = new AbortController();
}
