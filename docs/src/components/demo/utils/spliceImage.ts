export const spliceImage = (canvas: HTMLCanvasElement, imageData: ImageData, patchSize: number, x: number, y: number) => {
  const startX = x * patchSize;
  const startY = y * patchSize;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, startX, startY);
};
