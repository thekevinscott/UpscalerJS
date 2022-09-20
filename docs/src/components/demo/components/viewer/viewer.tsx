import React, { DOMAttributes, useEffect, useState } from 'react';
import styles from './viewer.module.scss';
import 'image-comparison-viewer';
import { ImageComparisonViewer } from 'image-comparison-viewer';
import { getHTMLImageElement } from '../../utils/getHTMLImageElement';
import { resizeImage } from '../../utils/resizeImage';

const SCALE = 4;

export default function Viewer({
  src,
  upscaledSrc,
  zoom,
}: {
  zoom?: number;
  upscaledSrc?: string;
  src?: string;
}) {
  const [resizedImage, setResizedImage] = useState<HTMLImageElement>();

  useEffect(() => {
    if (src) {
      getHTMLImageElement(src).then(img => resizeImage(img, SCALE)).then(getHTMLImageElement).then(setResizedImage);
    } else if (resizedImage) {
      setResizedImage(undefined);
    }
  }, [src]);

  if (!src) {
    return (
      <div id={styles.viewer}>
        <image-comparison-viewer></image-comparison-viewer>
      </div>
    );
  }

  return (
    <div id={styles.viewer}>
      <image-comparison-viewer zoom={zoom} comparisonX={0.5}>
        <img src={upscaledSrc} />
        <img src={resizedImage?.src} />
      </image-comparison-viewer>
    </div>
  );
}

type CustomElement<T> = Partial<T & DOMAttributes<T>>;

declare global {
  namespace JSX { // skipcq: js-0337
    interface IntrinsicElements {
      ['image-comparison-viewer']: CustomElement<ImageComparisonViewer>;
    }
  }
}

