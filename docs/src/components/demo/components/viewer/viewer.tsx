import React, { useRef, Ref, forwardRef, DOMAttributes, useEffect, useState } from 'react';
import styles from './viewer.module.scss';
import 'image-comparison-viewer';
import { ImageComparisonViewer } from 'image-comparison-viewer';
import { getHTMLImageElement } from '../../utils/getHTMLImageElement';
import { resizeImage } from '../../utils/resizeImage';

interface Props {
  zoom?: number;
  img?: HTMLImageElement;
  scale?: number;
}

const useResizedImage = (img?: HTMLImageElement, scale?: number) => {
  const resizedRef = useRef<HTMLCanvasElement>();
  useEffect(() => {
    const canvas = resizedRef.current;
    if (img && scale && canvas) {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }, [img, scale, resizedRef]);

  return resizedRef;
};


const Viewer = forwardRef<Ref, Props>(({
  img,
  zoom,
  scale,
}, upscaledRef) => {
  const resizedRef = useResizedImage(img, scale);
  const width = img?.width;
  const height = img?.height;

  if (!width || !height || !scale) {
    return null;
  }

  const imgWidth = width * scale;
  const imgHeight = height * scale;

  return (
    <div id={styles.viewer}>
      <image-comparison-viewer zoom={zoom} comparisonX={0.5}>
        <canvas ref={upscaledRef} width={imgWidth} height={imgHeight} />
        <canvas ref={resizedRef} width={imgWidth} height={imgHeight} />
      </image-comparison-viewer>
    </div>
  );
});

type CustomElement<T> = Partial<T & DOMAttributes<T>>;

declare global {
  namespace JSX { // skipcq: js-0337
    interface IntrinsicElements {
      ['image-comparison-viewer']: CustomElement<ImageComparisonViewer>;
    }
  }
}

export default Viewer;
