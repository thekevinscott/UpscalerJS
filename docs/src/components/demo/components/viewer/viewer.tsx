import React, { DOMAttributes, useEffect, useState } from 'react';
import styles from './viewer.module.scss';
import 'image-comparison-viewer';
import { ImageComparisonViewer } from 'image-comparison-viewer';
import { getHTMLImageElement } from '../../utils/getHTMLImageElement';
import { resizeImage } from '../../utils/resizeImage';

export default function Viewer({
  src,
  upscaledSrc,
  zoom,
  scale,
}: {
  zoom?: number;
  upscaledSrc?: string;
  src?: HTMLImageElement;
  scale?: number;
}) {
  const [resizedImage, setResizedImage] = useState<string>();
  const [oldSrc, setOldSrc] = useState<string>();

  useEffect(() => {
    setOldSrc(src?.src);
  }, [src]);

  useEffect(() => {
    if (oldSrc && oldSrc !== src?.src) {
      setResizedImage(undefined);
    }
  }, [src, oldSrc]);

  useEffect(() => {
    if (src && scale) {
      const _resizedImage = resizeImage(src, scale);
      setResizedImage(_resizedImage);
    } else {
      setResizedImage(undefined);
    }
  }, [src, resizedImage, scale]);

  if (!resizedImage) {
    return (
      <div id={styles.viewer}>
        <image-comparison-viewer></image-comparison-viewer>
      </div>
    );
  }

  return (
    <div id={styles.viewer}>
      <image-comparison-viewer zoom={zoom} comparisonX={0.5}>
        {<img src={upscaledSrc} />}
        {<img src={resizedImage} />}
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

