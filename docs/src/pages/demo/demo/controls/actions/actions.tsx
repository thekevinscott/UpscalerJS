import React from 'react';
import styles from './actions.module.scss';
import { Range } from '@site/src/components/range/range';
import { Button } from '@site/src/components/button/button';
import { Icon } from '@site/src/components/icon/icon';

export default function Actions({ 
}) {
  return (
    <div id={styles.actions}>
      <div id={styles.left}>
        <Range defaultValue={2} label="Zoom" help-text="Control the zoom of the side-by-side original and upscaled image" min={0} max={4} step={.01} />
      </div>
      <div id={styles.right}>
        <Button size="large" variant="primary">
          Download Upscaled Image
          <Icon slot="suffix" name="download"></Icon>
        </Button>
      </div>
    </div>
  );
}

