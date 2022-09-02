import { getCanvas } from "./getCanvas";

const scaleCanvas = (canvas, scale) => {
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = canvas.width * scale;
  scaledCanvas.height = canvas.height * scale;

  scaledCanvas
    .getContext('2d')
    .drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  return scaledCanvas;
};

export const resizeImage = (img: HTMLImageElement, scale: number) => {
  const canvas = getCanvas(img);
  return scaleCanvas(canvas, scale).toDataURL();
};
