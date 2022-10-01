import React from 'react';
import styles from './uploadDialogue.module.scss';
import UploadPane from '../uploadPane/uploadPane';
import Dialogue from '../dialogue/dialogue';

export default function UploadDialogue() {
  return (
    <Dialogue>
      <div id={styles.uploadDialogue}>
        <UploadPane size="large" />
      </div>
    </Dialogue>
  );
}

