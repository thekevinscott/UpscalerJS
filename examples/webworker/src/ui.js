const target = document.getElementById('target');
const info = document.getElementById('info');
const buttonWithWW = document.getElementById('button-webworker');
const buttonWithoutWW = document.getElementById('button-no-webworker');

export const disable = () => new Promise(resolve => {
  target.innerHTML = '';
  info.innerText = 'Upscaling...';
  buttonWithWW.disable = true;
  buttonWithoutWW.disable = true;
  window.requestAnimationFrame(resolve);
});

export const enable = () => {
  buttonWithWW.disable = false;
  buttonWithoutWW.disable = false;
};

export const writeOutput = (src) => {
  const img = document.createElement('img');
  img.src = src;
  target.innerHTML = '';
  target.appendChild(img);
  info.innerText = 'Upscaled';
  enable();
}
