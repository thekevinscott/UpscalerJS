import palette from 'google-palette';

function rotate <T>(arr: T[], n = 1) {
  for (let i = 0; i < n; i++) {
    arr.push(arr.shift());
  }
  return arr;
};

export function getColors<T extends string>(arr: T[], paletteType: string, rotateN = 1) {
  const colors = rotate(palette(paletteType, arr.length), rotateN);
  const colorsObj = colors.reduce((obj: Record<T, string>, color: string, i) => ({
    ...obj,
    [arr[i]]: `#${color}`,
  }), {} as Record<T, string>);
  return colorsObj;
};
