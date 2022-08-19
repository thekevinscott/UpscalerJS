import React, { createRef, DOMAttributes, useCallback, useEffect, useRef, useState } from 'react';
import styles from './viewer.module.scss';
import 'image-comparison-viewer';
import { ImageComparisonViewer, ImageComparisonViewerDraggerHandle, DraggerChangeEvent } from 'image-comparison-viewer';
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
  const [handleX, setHandleX] = useState(.5);
  const handleDrag = useCallback(({ detail }: DraggerChangeEvent) => {
    setHandleX(detail.x)
  }, []);

  const [resizedImage, setResizedImage] = useState<HTMLImageElement>();

  useEffect(() => {
    if (src) {
      getHTMLImageElement(src).then(img => resizeImage(img, SCALE)).then(getHTMLImageElement).then(setResizedImage);
    } else if (resizedImage) {
      setResizedImage(undefined);
    }
  }, [src]);
  const foo = useRef<HTMLDivElement>();

  useEffect(() => {
    document.body.addEventListener('dragger-change-event', handleDrag);

    return () => {
      document.body.removeEventListener('dragger-change-event', handleDrag);
    };
  }, []);


  if (!src) {
    return (
      <div id={styles.viewer}>
        <image-comparison-viewer></image-comparison-viewer>
      </div>
    );
  }

  return (
    <div id={styles.viewer}>
      <image-comparison-viewer-dragger-handle ref={foo} initialValue={handleX} onDraggerChangeEvent={handleDrag} />
      <image-comparison-viewer comparisonX={handleX} zoom={zoom}>
        <img src={upscaledSrc} />
        <img src={resizedImage?.src} />
      </image-comparison-viewer>
    </div>
  );
}

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['image-comparison-viewer']: CustomElement<ImageComparisonViewer>;
      ['image-comparison-viewer-dragger-handle']: CustomElement<ImageComparisonViewerDraggerHandle>;
    }
  }
}

