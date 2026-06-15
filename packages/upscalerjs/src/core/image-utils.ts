import { Coordinate, Patch, } from "./types";

const get1DPatch = (total: number, idx: number, patchSize: number, padding: number) => {
  let preOrigin = idx;
  const prePadding = idx === 0 ? 0 : patchSize === total ? 0 : padding;
  const isBeyondBounds = preOrigin + patchSize > total;
  let postOrigin = isBeyondBounds ? patchSize - (total - preOrigin) : 0;
  const postPadding = isBeyondBounds ? 0 : patchSize === total ? 0 : padding;
  const prePaddingAdjusted = isBeyondBounds ? 0 : prePadding;
  let postSize = patchSize - (isBeyondBounds ? postOrigin : 0);
  if (isBeyondBounds) {
    preOrigin = total - patchSize;
  }
  preOrigin -= prePaddingAdjusted;
  postOrigin += prePaddingAdjusted;
  postSize -= prePaddingAdjusted + postPadding;
  const increment = patchSize > total ? total : patchSize - prePadding - postPadding;
  return {
    pre: {
      origin: preOrigin,
      size: patchSize,
    },
    post: {
      origin: postOrigin,
      size: postSize,
    },
    increment,
  };
};

export const getPatchesFromImage = ([width, height,]: Coordinate, patchSize: number, padding: number): Patch[][] => {
  const patches: Patch[][] = [];
  let x = 0;
  let y = 0;
  while (y < height) {
    const {
      pre: {
        origin: preOriginY,
        size: preSizeY,
      },
      post: {
        origin: postOriginY,
        size: postSizeY,
      },
      increment: yIncrement,
    } = get1DPatch(height, y, Math.min(patchSize, height), padding);

    const row: Patch[] = [];

    while (x < width) {
      const {
        pre: {
          origin: preOriginX,
          size: preSizeX,
        },
        post: {
          origin: postOriginX,
          size: postSizeX,
        },
        increment: xIncrement,
      } = get1DPatch(width, x, Math.min(patchSize, width), padding);

      row.push({
        pre: {
          origin: [preOriginY, preOriginX,],
          size: [preSizeY, preSizeX,],
        },
        post: {
          origin: [postOriginY, postOriginX,],
          size: [postSizeY, postSizeX,],
        },
      });
      x += xIncrement;
    }
    patches.push(row);
    x = 0;
    y += yIncrement;
  }
  return patches;
};
