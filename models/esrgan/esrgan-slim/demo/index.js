import Upscaler from "upscaler";
import * as models from '@upscalerjs/esrgan-slim';
import flower from "./flower.png";

const upscaler = new Upscaler({
  model: models.x2,
});

upscaler.upscale(flower).then((upscaledImgSrc) => {
  const img = document.createElement("img");
  img.src = upscaledImgSrc;
  document.getElementById("target").appendChild(img);
});
