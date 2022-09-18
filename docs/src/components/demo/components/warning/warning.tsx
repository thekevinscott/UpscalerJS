import React from 'react';
import styles from './warning.module.scss';
import { Alert } from '@site/src/components/alert/alert';
import { Icon } from '@site/src/components/icon/icon';
import { Button } from '@site/src/components/button/button';
import Dialogue from '../dialogue/dialogue';
import Pane from '../pane/pane';
import { Size, UpscaleChoice } from '../../types';

export type Choose = (option: UpscaleChoice) => void;
export default function Warning({
  choose,
  img,
  originalSize: { width, height },
}: {
  img: HTMLImageElement;
  choose: Choose;
  originalSize: Size,
}) {
  return (
    <Dialogue>
      <Pane> 
      <div id={styles.warning}>
        <Alert variant="warning" open>
          <Icon slot="icon" name="exclamation-triangle" />
          <strong>Large Image Detected</strong>
        </Alert>
        <img id={styles.uploadedImage} src={img.src} />
        <p>
          Your image is <strong>{width}</strong> by <strong>{height}</strong> pixels. Large images can take a long time to upscale in the browser.
        </p>
        <p>
          We recommend first downscaling your image to 
          to <strong>{img.width}</strong> by <strong>{img.height}</strong> pixels before 
          upscaling to demonstrate UpscalerJS.
        </p>
        <div id={styles.options}>
          <div id={styles.left}>
          <a onClick={() => choose('original')}>I understand, use the original image!</a>
          </div>
          <div id={styles.right}>
            <Button variant='primary' onClick={() => choose('downscaled')}>
              Use the downscaled version
            </Button>
          </div>
        </div>
      </div>
      </Pane>
    </Dialogue>
  );
}
