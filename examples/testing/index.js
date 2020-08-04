import Upscaler from 'upscaler';
const target = document.getElementById('target');

const upscaler = new Upscaler({
  model: '2x',
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.src = src;
  img.crossOrigin = 'anonymous';
  img.style = 'border: 1px solid gray;';
  img.onload = () => resolve(img);
  img.onerror = reject;
});

const getOpts = (maxPatchSize, maxPadding) => {
  // const patchSize = Math.ceil(Math.random() * maxPatchSize);
  // const padding = Math.ceil(Math.random() * maxPadding);
  const patchSize = null;
  const padding = 0;
  return {
    patchSize,
    padding,
  };
}

const testLots = async (n = 5, maxWidth = 200, maxHeight = 200) => {
  for (let i = 0; i < n; i++) {
    const width = Math.ceil(Math.random() * maxWidth);
    const height = Math.ceil(Math.random() * maxHeight);
    // const width = 20;
    // const height = 10;
    const src = `https://picsum.photos/${width}/${height}`;
    const opts = getOpts(maxWidth, 20);
    try {
      const originalImage = await loadImage(src);
      const container = document.createElement('div');
      container.style = 'float: left; border: 1px solid black; padding: 5px;';
      container.appendChild(originalImage);

      const now = new Date().getTime();
      const upscaledImgSrc = await upscaler.upscale(originalImage, opts);
      const end = new Date().getTime() - now;
      const upscaledImage = await loadImage(upscaledImgSrc);
      container.appendChild(upscaledImage);
      const info = document.createElement('p');
      info.innerText = [
        `${end} ms`,
        `${width}x${height}`,
        `${upscaledImage.width}x${upscaledImage.height}`,
        `${JSON.stringify(opts)}`,
      ].join(' | ');
      info.style = 'margin: 0;'
      container.appendChild(info);
      target.appendChild(container);
    } catch (err) {
      console.error(`Error with ${width}x${height}: ${src} | ${JSON.stringify(opts)}`)
      debugger;
    }
  }
};

testLots(1);
