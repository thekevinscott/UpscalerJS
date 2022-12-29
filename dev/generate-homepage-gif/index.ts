const info = document.getElementById('info')!;
const output = document.getElementById('output')!;
import Upscaler from 'upscaler';
import x4 from '@upscalerjs/esrgan-thick';

const upscaler = new Upscaler({
  model: x4,
});

info.innerText = 'Generating images';
output.innerText = 'hi';
