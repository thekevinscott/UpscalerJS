export const removeAlpha = (img: HTMLImageElement): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
