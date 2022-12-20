import * as tf from "@tensorflow/tfjs";
import flower from "./flower.png";
import Upscaler from "upscaler";
const button = document.getElementById("button");
const info = document.getElementById("info");

const upscaler = new Upscaler();
button.onclick = () => {
  info.innerText = "Upscaling...";
  const img = new Image();
  img.src = flower;
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const pixels = tf.browser.fromPixels(img);
    upscaler
      .upscale(pixels, {
        output: "tensor"
      })
      .then(upscaledImg => {
        upscaledImg.print();
        info.innerText = "Open your console to see the tensor.";
      });
  };
};
