import Upscaler from "upscaler";
import models from '@upscalerjs/esrgan-thick';
import flowert from "./flower.png";

const upscaler = new Upscaler({
  model: models.x2,
});

upscaler.upscale(flowert).then((upscaledImgSrc) => {
  const img = document.createElement("img");
  img.src = upscaledImgSrc;
  document.getElementById("target").appendChild(img);
});
