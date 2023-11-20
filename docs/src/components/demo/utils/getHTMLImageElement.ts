const TIMEOUT = 5000;

export const getHTMLImageElement = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  let timer = setTimeout(() => {
    reject(`Image load timed out in ${TIMEOUT}ms. src: ${src}`);
  }, TIMEOUT);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  img.onload = () => {
    clearTimeout(timer);
    resolve(img);
  }
  img.onerror = (err) => {
    clearTimeout(timer);
    reject(err);
  }
});
