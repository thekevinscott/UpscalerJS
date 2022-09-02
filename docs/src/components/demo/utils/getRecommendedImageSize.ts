import type { Size } from "../types";

const PIXEL_THRESHOLD = 600;

const asInt = (n: number) => parseInt(`${n}`, 10);

export const getRecommendedImageSize = (img: HTMLImageElement): Size => {
  const divisor = PIXEL_THRESHOLD / Math.max(img.width, img.height);
  const width = asInt(img.width * divisor);
  const height = asInt(img.height * divisor);

  if (width > img.width && height > img.height) {
    return { width: img.width, height: img.height };
  }
  return { width, height }
};
