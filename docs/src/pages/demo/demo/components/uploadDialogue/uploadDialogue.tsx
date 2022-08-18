import React from 'react';
import styles from './uploadDialogue.module.scss';
import UploadPane from '../uploadPane/uploadPane';

export default function UploadDialogue({ }) {
  return (
    <div id={styles.uploadDialogue}>
      <UploadPane size="large" />
    </div>
  );
}

