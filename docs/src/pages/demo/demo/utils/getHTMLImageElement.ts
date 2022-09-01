export const getHTMLImageElement = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.src = src;
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = (err) => reject(err);
});
