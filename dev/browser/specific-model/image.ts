export const getCanvas = (img: HTMLImageElement) => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const scaleCanvas = (canvas: HTMLCanvasElement, scale: number) => {
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = canvas.width * scale;
  scaledCanvas.height = canvas.height * scale;

  scaledCanvas
    .getContext('2d')
    ?.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  return scaledCanvas;
};

export const resizeImage = (img: HTMLImageElement, scale: number) => {
  const canvas = getCanvas(img);
  const scaledCanvas = scaleCanvas(canvas, scale);
  return scaledCanvas;
};

const loadImage = (path: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.src = path;
  img.onload = () => {
    resolve(img);
  };
  img.onerror = reject;
});

export const makeImg = async (path: string, label: string, scale?: number): Promise<HTMLImageElement | HTMLCanvasElement> => {
  let img: HTMLImageElement | HTMLCanvasElement = await loadImage(path);

  if (scale) {
    img = resizeImage(img, scale);
  }

  const divEl = document.createElement('div');
  const imgEl = document.createElement('img');
  const labelEl = document.createElement('label');
  labelEl.innerText = label;
  imgEl.src = path;
  imgEl.width = img.width;
  imgEl.height = img.height;
  imgEl.appendChild(img);

  divEl.appendChild(labelEl);
  divEl.appendChild(imgEl);
  divEl.appendChild(document.createElement('hr'));

  document.body.appendChild(divEl);
  return imgEl;
}
