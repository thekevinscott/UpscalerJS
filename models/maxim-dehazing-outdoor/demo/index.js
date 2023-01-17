import Upscaler from "upscaler";
import * as models from '@upscalerjs/maxim-dehazing-outdoor';
import fixture from "./fixture.png";

const upscaler = new Upscaler({
  model: models.small,
});

upscaler.upscale(fixture).then((upscaledImgSrc) => {
  const img = document.createElement("img");
  img.src = upscaledImgSrc;
  document.getElementById("target").appendChild(img);
});