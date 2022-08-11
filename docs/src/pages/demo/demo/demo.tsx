import React from 'react';
import Layout from '@theme/Layout';
import styles from './demo.module.scss';
import Checkerboard from '@site/src/components/checkboard';
import Sidebar from './sidebar/sidebar';

export default function Demo() {
  return (
    <div id={styles.page}>
      <Checkerboard />
      <Sidebar />
    </div>
  );
}

