// import { getCanvas } from "./getCanvas";
// import { getHTMLImageElement } from "./getHTMLImageElement";

// export const spliceImage = async (baseSrc: string, slice: undefined | string, startX: number, startY: number, endX: number, endY: number) => {
//   const canvas = getCanvas(await getHTMLImageElement(baseSrc))
//   if (slice) {
//     console.log('slice', slice);
//     document.body.prepend(await getHTMLImageElement(slice));
//     canvas.getContext('2d').drawImage(await getHTMLImageElement(slice), startX, startY, endX, endY);
//   }
//   return canvas.toDataURL();
// };
