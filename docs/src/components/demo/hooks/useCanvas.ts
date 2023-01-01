import { useCallback, useRef } from 'react';
import { spliceImage } from '../utils/spliceImage';

const OVERLAY_TEXT = "UPSCALING";
const TEXT_PADDING = 30;
const TEXT_FONT_SIZE = 40;

const drawOverlaidText = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.font = `${TEXT_FONT_SIZE}px Arial Black`;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  const { width: textWidth } = ctx.measureText(OVERLAY_TEXT);
  const textWidthWithPadding = textWidth + TEXT_PADDING;
  const textHeightWithPadding = TEXT_FONT_SIZE + TEXT_PADDING;
  const cols = Math.ceil(width * 2/ textWidthWithPadding);
  const rows = Math.ceil(height * 2 / textHeightWithPadding);
  ctx.rotate(-30 * Math.PI / 180);
  ctx.translate(width * -0.5, height * -0.5);

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      ctx.fillText(OVERLAY_TEXT, col * textWidthWithPadding, row * textHeightWithPadding + TEXT_FONT_SIZE);
    }
  }

  // ctx.restore();
  return canvas;
}

const manipulateOriginalImage = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  const imgPixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let min = Infinity;
  for (let y = 0; y < imgPixels.height; y++) {
    for (let x = 0; x < imgPixels.width; x++) {
      const i = (y * 4) * imgPixels.width + x * 4;
      const avg = (imgPixels.data[i] + imgPixels.data[i + 1] + imgPixels.data[i + 2]) / 3 / 2;
      if (avg < min) {
        min = avg;
      }
      imgPixels.data[i] = avg;
      imgPixels.data[i + 1] = avg;
      imgPixels.data[i + 2] = avg;
    }
  }
  ctx.putImageData(imgPixels, 0, 0, 0, 0, imgPixels.width, imgPixels.height);
  ctx.drawImage(drawOverlaidText(canvas.width, canvas.height), 0, 0, canvas.width, canvas.height);
  // Draw text on top
};

export const useCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const createCanvasAndSetImage = useCallback((img: HTMLImageElement, scale?: number) => {
    if (!scale) {
      throw new Error('scale is not defined');
    }
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

