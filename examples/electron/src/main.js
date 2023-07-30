import Upscaler from 'upscaler';
import defaultModel from '@upscalerjs/default-model';
const target = document.getElementById("target");
const button = document.getElementById("button");
const info = document.getElementById("info");
const originalImage = document.getElementById("flower");

const upscaler = new Upscaler({
  model: {
    ...defaultModel,
    path: './node_modules/@upscalerjs/default-model/models/model.json',
  },
});

button.disabled = false;
button.innerText = 'Upscale';
const upscale = () => {
  target.innerHTML = '';
  button.disabled = true;
  info.innerText = "Upscaling...";
  const start = new Date().getTime();
  upscaler.upscale(originalImage).then((upscaledImgSrc) => {
    button.disabled = false;
    const upscaledImage = document.createElement("img");
    upscaledImage.src = upscaledImgSrc;

    target.innerHTML = "";
    target.appendChild(upscaledImage);
    const ms = new Date().getTime() - start;
    info.innerText = `Upscaled in ${ms} ms`;
  });
};
button.onclick = () => {
  upscale();
};
