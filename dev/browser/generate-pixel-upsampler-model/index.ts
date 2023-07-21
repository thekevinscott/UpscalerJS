import * as tf from '@tensorflow/tfjs';
const imagesContainer = document.getElementById('images');
const output = document.getElementById('output');

const makeModel = (scale: number) => {
  const model = tf.sequential();
  model.add(tf.layers.upSampling2d({
    size: [scale, scale],
    dataFormat: 'channelsLast',
    inputShape: [null, null, 3],
  }));
  // model.add(tf.layers.dense({units: 1, inputShape: [1]}));

  model.compile({ loss: "meanSquaredError", optimizer: "sgd" });
  return model;
}

const isTensorList = (t: tf.Tensor | tf.Tensor[]): t is tf.Tensor[] => {
  return Array.isArray(t);
}

function predict(model, x) {
  let prediction = model.predict(x.expandDims(0));
  if (isTensorList(prediction)) {
    prediction = prediction[0];
  }
  return prediction.squeeze() as tf.Tensor3D;
}

const draw = async (t: tf.Tensor3D, scale: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = t.size[1] * scale;
  canvas.height = t.size[0] * scale;
  const imageContainer = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.innerHTML = `${scale}x`;
  imageContainer.className = 'image';
  imageContainer.appendChild(h3);
  imageContainer.appendChild(canvas);
  imagesContainer.appendChild(imageContainer);
  const resized = tf.image.resizeBilinear(t, [t.shape[0] * scale, t.shape[1] * scale]);
  await tf.browser.toPixels(resized, canvas);
  resized.dispose();
}

const generatePixelUpsampler = async () => {
  output.innerHTML = 'Generating pixel upsampler...';
  for (const scale of [2, 3, 4]) {
    const model = await makeModel(scale);
    output.innerHTML += `\nCreated pixel upsampler for scale ${scale}`;
    tf.tidy(() => {
      const input = tf.browser.fromPixels(document.getElementById('fixture') as HTMLImageElement);
      const prediction = predict(model, input);
      draw(prediction.div(255), scale);
    });
    model.save(`downloads://${scale}x`);
  }
};

const form = document.getElementsByTagName('form')[0] as HTMLFormElement;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  generatePixelUpsampler();
});
