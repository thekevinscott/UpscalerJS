import Upscaler from "upscaler";
import x4 from '@upscalerjs/esrgan-thick/4x';
import img from "./flower.png";
const target = document.getElementById("target");
const button = document.getElementById("button");
const info = document.getElementById("info");

const upscaler = new Upscaler({
  model: x4,
});
button.onclick = () => {
  button.disabled = true;
  info.innerText = "Upscaling...";
  const start = new Date().getTime();
  upscaler.upscale(img).then((upscaledImgSrc) => {
    button.disabled = false;
    const img = document.createElement("img");
    img.src = upscaledImgSrc;
    target.innerHTML = "";
    target.appendChild(img);
    const ms = new Date().getTime() - start;
    info.innerText = `Upscaled in ${ms} ms`;
  });
};
