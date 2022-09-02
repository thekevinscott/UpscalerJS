import { getHTMLImageElement } from "./getHTMLImageElement";

export const removeAlpha = async (src: string) => {
  const canvas = document.createElement('canvas');
  const img = await getHTMLImageElement(src);
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return getHTMLImageElement(canvas.toDataURL());
}
