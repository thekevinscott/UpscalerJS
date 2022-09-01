import { useCallback, useRef } from 'react';
import { getHTMLImageElement } from '../utils/getHTMLImageElement';
import { spliceImage } from '../utils/spliceImage';

const manipulateOriginalImage = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  var imgPixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let min = Infinity;
  for (var y = 0; y < imgPixels.height; y++) {
    for (var x = 0; x < imgPixels.width; x++) {
      var i = (y * 4) * imgPixels.width + x * 4;
      var avg = (imgPixels.data[i] + imgPixels.data[i + 1] + imgPixels.data[i + 2]) / 3 / 2;
      if (avg < min) {
        min = avg;
      }
      imgPixels.data[i] = avg;
      imgPixels.data[i + 1] = avg;
      imgPixels.data[i + 2] = avg;
    }
  }
  ctx.putImageData(imgPixels, 0, 0, 0, 0, imgPixels.width, imgPixels.height);
};

export const useCanvas = (scale: number) => {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const createCanvasAndSetImage = useCallback((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    manipulateOriginalImage(canvas);
    canvasRef.current = canvas;
    return canvas.toDataURL();
  }, []);

  const drawImage = useCallback(async (slice: string, patchSize: number, x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('Canvas element has not been created');
    }

    return await spliceImage(canvas, slice, patchSize, x, y);
  }, [canvasRef]);

  return { createCanvas: createCanvasAndSetImage, drawImage };
};

