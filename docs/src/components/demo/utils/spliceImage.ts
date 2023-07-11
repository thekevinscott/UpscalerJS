export const spliceImage = (canvas: HTMLCanvasElement, imageData: ImageData, x: number, y: number) => {
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, x, y);
};
