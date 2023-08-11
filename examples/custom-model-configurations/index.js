import Upscaler from "upscaler";
import img from "/flower.png?url";
const target = document.getElementById("target");
const button = document.getElementById("button");
const info = document.getElementById("info");

/**
 * tf refers to the currently active Tensorflow.js library, which may be 
 * @tensorflow/tfjs, @tensorflow/tfjs-node, or @tensorflow/tfjs-node-gpu.
 **/
const setup = (tf) => {
  const Layer = tf.layers.Layer;
  const BETA = 0.2;

  class MultiplyBeta extends Layer {
    beta;

    constructor() {
      super({});
      this.beta = BETA;
    }

    call(inputs) {
      return tf.mul(getInput(inputs), this.beta);
    }

    static className = 'MultiplyBeta';
  }

  const getPixelShuffle = (_scale) => {
    class PixelShuffle extends Layer {
      scale = _scale;

      constructor() {
        super({});
      }

      computeOutputShape(inputShape) {
        return [inputShape[0], inputShape[1], inputShape[2], 3,];
      }

      call(inputs) {
        return tf.depthToSpace(getInput(inputs), this.scale, 'NHWC');
      }

      static className = `PixelShuffle${scale}x`;
    }

    return PixelShuffle;
  };

  [
    MultiplyBeta,
    getPixelShuffle(scale),
  ].forEach((layer) => {
    tf.serialization.registerClass(layer);
  });
};

const upscaler = new Upscaler({
  model: {
    scale: 2,
    path: '/model/model.json',
    preprocess: input => tf.tidy(() => tf.mul(input, 1 / 255)),
    postprocess: output => tf.tidy(() => output.clipByValue(0, 255)),
    setup,
  },
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
