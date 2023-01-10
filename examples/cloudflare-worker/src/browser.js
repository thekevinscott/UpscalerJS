(async () => {
  /***
   * Functions
   */
  const addScript = (src) => new Promise(resolve => {
    var s = document.createElement('script');
    s.setAttribute('src', src);
    document.body.appendChild(s);
    s.addEventListener('load', resolve);
  });

  const loadImg = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.src = src;
    image.crossOrigin = 'anonymous';
    image.onload = async () => resolve(image);
    image.onerror = reject;
  });

  /***
   * Main code
   */

  // Load TFJS via UMD
  await addScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.1.0/dist/tf.min.js');

  // get a pixel representation of a sample image
  const imgPath = 'https://i.imgur.com/fHyEMsl.jpg';
  const pixels = window.tf.browser.fromPixels(await loadImg(imgPath));

  // convert image into suitable format and post
  const body = JSON.stringify({
    data: Array.from(await pixels.data()),
    shape: pixels.shape,
  });
  const response = await fetch('/', {
    method: 'POST',
    body,
  });

  // parse response and cast to tensor
  const { data, shape } = await response.json();
  const tensor = tf.tensor(data, shape);

  // create dummy canvas to draw image to
  const canvas = document.createElement('canvas');
  canvas.height = shape[0];
  canvas.width = shape[1];

  // draw image to canvas
  await tf.browser.toPixels(tf.tidy(() => tensor.div(255)), canvas);
  tensor.dispose();

  // display image in browser
  const url = canvas.toDataURL();
  const img = await loadImg(url);
  document.body.prepend(img);
})();
