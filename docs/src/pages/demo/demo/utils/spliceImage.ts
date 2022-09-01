import { getHTMLImageElement } from "./getHTMLImageElement";

export const spliceImage = async (canvas: HTMLCanvasElement, slice: undefined | string, patchSize: number, x: number, y: number) => {
  if (slice) {
    const sliceEl = await getHTMLImageElement(slice);
    const startX = x * patchSize;
    const startY = y * patchSize;
    canvas.getContext('2d').drawImage(await getHTMLImageElement(slice), startX, startY, sliceEl.width, sliceEl.height);
  }
  return canvas.toDataURL();
};
