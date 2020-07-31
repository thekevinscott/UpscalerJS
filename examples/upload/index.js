import Upscaler from 'upscaler';
const table = document.getElementById('table');
const original = document.getElementById('original');
const target = document.getElementById('target');
const file = document.getElementById('file');
const info = document.getElementById('info');

const createImage = (targetDiv, src) => {
  const img = document.createElement('img');
  img.src = src;
  targetDiv.innerHTML = '';
  targetDiv.appendChild(img);
  return img;
}

const upscaler = new Upscaler({
  model: '2x',
});
file.addEventListener("change", handleFiles, false);
function handleFiles() {
  info.innerText = 'Upscaling...';
  table.style = '';

  const file = this.files[0];
  const fr = new FileReader();
  fr.onload = () => {
    const img = createImage(original, fr.result);
    const start = new Date().getTime();
    upscaler.upscale(img).then((upscaledImgSrc) => {
      createImage(target, upscaledImgSrc);
      const ms = new Date().getTime() - start;
      info.innerText = `Upscaled in ${ms} ms`;
    });
  };
  fr.readAsDataURL(file);
};
