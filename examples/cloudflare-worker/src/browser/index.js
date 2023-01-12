import * as tf from '@tensorflow/tfjs';
import flower from './flower-small.png';

const go = document.getElementById('go');
const output = document.getElementById('output');

const CLOUDFLARE_URL = 'http://0.0.0.0:8787';

const loadImg = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.src = src;
  image.crossOrigin = 'anonymous';
  image.onload = async () => resolve(image);
  image.onerror = reject;
});

const loadImage = async () => {
  output.innerText = 'Loading...';

  // get a pixel representation of a sample image
  const pixels = tf.browser.fromPixels(await loadImg(flower));

  output.innerText = 'Sending image for upscaling...';
  // convert image into suitable format and post
  const body = JSON.stringify({
    data: Array.from(await pixels.data()),
    shape: pixels.shape,
  });
  const response = await fetch(CLOUDFLARE_URL, {
    method: 'POST',
    body,
  });

  output.innerText = 'Got response, parsing';
  // parse response and cast to tensor
  const text = await response.text(); // get it as text so we can parse if an error
  try {
    const parsed = JSON.parse(text);
    if ('err' in parsed) {
      throw new Error(parsed.err);
    }
    const { data, shape } = parsed;
    const tensor = tf.tensor(data, shape);

    // create canvas to draw image to
    const canvas = document.createElement('canvas');
    canvas.height = shape[0];
    canvas.width = shape[1];

    // draw image to canvas
    await tf.browser.toPixels(tf.tidy(() => tensor.div(255)), canvas);
    tensor.dispose();

    output.innerHTML = '';
    output.append(canvas);
  } catch(err) {
    console.error(err, text);
  }
};

go.addEventListener('click', loadImage);
loadImage();
