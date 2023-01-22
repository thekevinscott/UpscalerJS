import * as tf from '@tensorflow/tfjs';
window.tf = tf;
const GRAPH_MODEL = '/models/maxim-denoising/models/float16/model.json';
const LAYERS_MODEL = '/models/esrgan-slim/models/2x/model.json';

(async () => {
  document.getElementById('status').innerText = 'loading';
  window.models = await Promise.all([
    tf.loadGraphModel(GRAPH_MODEL),
    tf.loadLayersModel(LAYERS_MODEL),
  ]);

  document.getElementById('status').innerText = 'ready';
})();
