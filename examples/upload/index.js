import * as tf from "@tensorflow/tfjs";
import Upscaler from "upscaler";
const table = document.getElementById("table");
const original = document.getElementById("original");
const target = document.getElementById("target");
const file = document.getElementById("file");
const info = document.getElementById("info");

const createImage = (targetDiv, src) => {
  const img = document.createElement("img");
  img.src = src;
  targetDiv.innerHTML = "";
  targetDiv.appendChild(img);
  return img;
};

const upscaler = new Upscaler({
  warmupSizes: [[64, 64]],
});
async function handleFiles() {
  info.innerText = "Upscaling...";
  target.innerHTML = "";
  table.style = "";
  await tf.nextFrame();
  const file = this.files[0];
  const fr = new FileReader();
  fr.onload = async () => {
    const img = createImage(original, fr.result);
    const start = new Date().getTime();
    const upscaledImgSrc = await upscaler.upscale(img, {
      patchSize: 64,
      padding: 5,
    });
    createImage(target, upscaledImgSrc);
    const ms = new Date().getTime() - start;
    info.innerText = `Upscaled in ${ms} ms`;
  };
  fr.readAsDataURL(file);
}

file.addEventListener("change", handleFiles, false);
