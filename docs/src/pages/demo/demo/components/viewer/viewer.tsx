import React, { DOMAttributes, useCallback, useState } from 'react';
import styles from './viewer.module.scss';
import 'image-comparison-viewer';
import { ImageComparisonViewer, ImageComparisonViewerDraggerHandle, DraggerChangeEvent } from 'image-comparison-viewer';
import { State, UploadedImage } from '../../types';

export default function Viewer({
  img,
  state,
}: {
  img: UploadedImage;
  state: State;
}) {
  const [handleX, setHandleX] = useState(.5);
  const handleDrag = useCallback(({ detail }: DraggerChangeEvent) => {
    setHandleX(detail.x)
  }, []);

  return (
    <div id={styles.viewer}>
      {state === State.COMPLETE && (
        <image-comparison-viewer-dragger-handle initialValue={handleX} onDraggerChangeEvent={handleDrag} />
      )}
      <image-comparison-viewer comparisonX={handleX}>
        {state === State.COMPLETE && img && (
          <>
            <img src={img.src} />
            <img src={img.src} />
          </>
        )}
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

