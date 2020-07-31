import Upscaler from 'upscaler';
const table = document.getElementById('table');
const original = document.getElementById('original');
const target = document.getElementById('target');
const file = document.getElementById('file');
const info = document.getElementById('info');
const video = document.getElementById('video');

const upscaler = new Upscaler({
  model: '2x',
});
