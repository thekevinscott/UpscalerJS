import Upscaler from "upscaler";
import model from '@upscalerjs/default-model';
import flower from "./flower.png";

const upscaler = new Upscaler({
  model,
});

upscaler.upscale(flower).then((upscaledImgSrc) => {
  const img = document.createElement("img");
  img.src = upscaledImgSrc;
  document.getElementById("target").appendChild(img);
});
