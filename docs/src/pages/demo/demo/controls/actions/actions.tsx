import React, { useCallback, useEffect, useRef } from 'react';
import styles from './actions.module.scss';
import { Range } from '@site/src/components/range/range';
import { Button } from '@site/src/components/button/button';
import { Icon } from '@site/src/components/icon/icon';

export type HandleZoom = (zoom: number) => void;
export default function Actions({ 
  handleZoom,
  zoom,
  handleDownload,
}: {
  handleDownload?: () => void;
  handleZoom: HandleZoom;
  zoom: number;
}) {
  const disabled = handleDownload === undefined;
  return (
    <div id={styles.actions}>
      <div id={styles.left}>
        <Range 
          value={zoom} 
          label="Zoom" 
          help-text="Control the zoom of the side-by-side original and upscaled image" 
          min={0} 
          max={4} 
          step={.01} 
          onChange={handleZoom}
        />
      </div>
      <div id={styles.right}>
        <Button disabled={disabled} size="large" variant="primary" onClick={handleDownload}>
          Download Upscaled Image
          <Icon slot="suffix" name="download"></Icon>
        </Button>
      </div>
    </div>
  );
}

