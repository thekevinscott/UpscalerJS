import React from 'react';
import styles from './warning.module.scss';
import { Alert } from '@site/src/components/alert/alert';
import { Icon } from '@site/src/components/icon/icon';
import { Button } from '@site/src/components/button/button';
import Upload from '../../upload/upload';

export default function Warning({
  width,
  height,
  handleProceed,
}: {
  width: number;
  height: number;
  handleProceed: () => void;
}) {
  return (
    <div id={styles.warning}>
      <Alert variant="warning" open>
        <Icon slot="icon" name="exclamation-triangle" />
        <strong>Large Image Detected</strong>
      </Alert>
      <p>Your image is <strong>{width}</strong> by <strong>{height}</strong> pixels, which may be too large to upscale in your browser.</p>
      <p>The speed of upscaling is determined by your hardware, browser, and the model you choose. Larger images can take extremely long amounts of time to upscale in the browser or, for particularly older hardware, crash your browser.</p>
      <p>To upscale larger images fast, you can run UpscalerJS server-side using NodeJS, and for the best speed, leverage a server-side GPU.</p>
      <div id={styles.options}>
        <div id={styles.left}>
        <a onClick={handleProceed}>I understand, please proceed!</a>
        </div>
        <div id={styles.right}>
          <Upload>
            {() => (
              <Button variant='primary'>
                Upload a smaller image
              </Button>
            )}
          </Upload>
        </div>
      </div>
    </div>
  );
}
