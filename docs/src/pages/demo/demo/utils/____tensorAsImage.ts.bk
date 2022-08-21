import * as tf from "@tensorflow/tfjs";

export const tensorAsImage = (t: tf.Tensor3D) => tf.tidy(() => {
  const canvas = document.createElement('canvas');
  const [height, width, ] = t.shape;
  canvas.width = width;
  canvas.height = height;
  tf.browser.toPixels(t.div(255) as tf.Tensor3D, canvas);
  return canvas.toDataURL();
});
