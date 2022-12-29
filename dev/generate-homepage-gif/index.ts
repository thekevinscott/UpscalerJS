const info = document.getElementById('info')!;
const output = document.getElementById('output')!;
const reset = document.getElementById('reset')!;
const animate = document.getElementById('animate')!;
const theme = document.getElementById('theme')!;
import Upscaler from 'upscaler';
import x4 from '@upscalerjs/esrgan-thick/4x';

const PATCH_SIZE = 64;
const PADDING = 2;

const IMAGE_SIZE = 512;
const SCALE = 4;

const write = (...msg: (string | number)[]) => info.innerText = msg.map(m => `${m}`).join(' | ');
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = document.createElement('img');
  img.src = src;
  img.onload = () => resolve(img);
});

const upscaler = new Upscaler({
  model: x4,
});

const images = [
  'images/flower.png',
  'images/face2.jpeg',
  'images/waifu.jpeg',
  'images/face3.jpeg',
  'images/ninja.png',
  // 'images/mountain.png',
];
const main = async () => {
  let upscaledImages: Record<string, string> = JSON.parse(localStorage.getItem('upscaledImages') || '{}');
  let animating = 0;

  const unprocessedImages: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (!upscaledImages[image]) {
      unprocessedImages.push(image);
    }
  }

  const rerender = async (imagesToProcess: string[]) => {
    animating += 1;
    try {
      upscaler.abort();
    } catch(err) {}
    animate.setAttribute('disabled', '1');
    upscaledImages = {};
    localStorage.setItem('upscaledImages', JSON.stringify(upscaledImages));

    write(`Warming up Upscaler, ${imagesToProcess.length} images to process`);
    await upscaler.warmup([{
      patchSize: PATCH_SIZE,
      padding: PADDING,
    }]);
    write('Upscaler ready');
    for (let i = 0; i < imagesToProcess.length; i++) {
      const image = imagesToProcess[i];
      const txt = `Generating images: ${i + 1} of ${imagesToProcess.length} for image "${image.split('/').pop()}"`;
      write(txt);
      const upscaledImage = await upscaler.upscale(image, {
        patchSize: PATCH_SIZE,
        padding: PADDING,
        awaitNextFrame: true,
        progress: async (rate) => {
          const progress = Math.round(rate * 100);
          write(txt, `${progress}%`);
        }
      });
      upscaledImages[image] = upscaledImage;
      localStorage.setItem('upscaledImages', JSON.stringify(upscaledImages));
    }
    write('Done generating images');
    animate.removeAttribute('disabled');
  };

  const addImageContainer = (img: HTMLImageElement, labelTxt: string) => {
    const container = document.createElement('div');
    container.className = 'img-container';
    container.appendChild(img);
    const label = document.createElement('label');
    label.innerText = labelTxt;
    container.appendChild(label);
    return container;
  }

  const doAnimate = async () => {
    write('Waiting to clear')
    await wait(2000);
    animating += 1;
    let localAnimating = animating;
    output.innerHTML = '';
    write('Animating');
    let i = 0;
    while(animating === localAnimating) {
      const img = await loadImage(images[i]);
      write(`Animating ${i + 1} of ${images.length}: ${images[i].split('/').pop()}`);
      const upscaledImg = await loadImage(upscaledImages[images[i]]);

      img.width = IMAGE_SIZE / SCALE;
      img.height = IMAGE_SIZE / SCALE;
      upscaledImg.width = IMAGE_SIZE / SCALE;
      upscaledImg.height = IMAGE_SIZE / SCALE;

      const imgContainer = addImageContainer(img, 'Original image');
      output.appendChild(imgContainer);
      await wait(900); // fade in

      imgContainer.classList.add('left');
      await wait(130);
      const upscaledContainer = addImageContainer(upscaledImg, 'Upscaled using @upscalerjs/esrgan-legacy 4x model');
      upscaledContainer.classList.add('right');
      output.appendChild(upscaledContainer);
      await wait(50);
      img.width = IMAGE_SIZE;
      img.height = IMAGE_SIZE;
      upscaledImg.width = IMAGE_SIZE;
      upscaledImg.height = IMAGE_SIZE;
      await wait(1000);
      imgContainer.querySelector('label')!.innerText = 'Original image, upscaled using native bicubic interpolation';
      await wait(3500);
      imgContainer.classList.add('fadeOut');
      upscaledContainer.classList.add('fadeOut');
      setTimeout(() => {
        imgContainer.remove();
        upscaledContainer.remove();
      }, 1000);
      await wait(500);

      i++;
      if (i >= images.length) {
        i = 0;
        await wait(1000);
      }
    }
  };

  animate.addEventListener('click', doAnimate);

  reset.addEventListener('click', () => rerender(images));

  if (unprocessedImages.length > 0) {
    rerender(unprocessedImages);
  } else {
    animate.removeAttribute('disabled');
    write('Ready to go!');
    doAnimate();
  }

  theme.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });
};

main();
