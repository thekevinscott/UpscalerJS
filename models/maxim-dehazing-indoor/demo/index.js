import Upscaler from "upscaler";
import model from '@upscalerjs/maxim-dehazing-indoor';
import fixture from "./fixture.png";

const upscaler = new Upscaler({
  model,
});

upscaler.upscale(fixture).then((upscaledImgSrc) => {
  const img = document.createElement("img");
  img.src = upscaledImgSrc;
  document.getElementById("target").appendChild(img);
});
