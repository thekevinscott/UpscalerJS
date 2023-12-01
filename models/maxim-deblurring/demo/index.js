import Upscaler from "upscaler";
import model from '@upscalerjs/maxim-deblurring';

const upscaler = new Upscaler({
  model,
});

const fixture = document.getElementById('fixture');
upscaler.upscale(fixture, { patchSize: 64, padding: 2, progress: console.log }).then((upscaledImgSrc) => {
  const img = document.createElement("img");
  img.src = upscaledImgSrc;
  document.getElementById("target").appendChild(img);
});
