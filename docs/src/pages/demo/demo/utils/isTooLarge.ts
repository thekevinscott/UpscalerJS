const PIXEL_THRESHOLD = 400;
const multThreshold = PIXEL_THRESHOLD * PIXEL_THRESHOLD;

export const isTooLarge = (el: HTMLImageElement) => {
  return el.width * el.height > multThreshold;
}
