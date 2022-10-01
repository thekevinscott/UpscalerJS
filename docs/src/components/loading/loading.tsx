import React from 'react';
import styles from './loading.module.scss';
import ReactLoading from 'react-loading';
import {useColorMode} from '@docusaurus/theme-common';

export function Loading() {
  const {colorMode} = useColorMode();

  return (
    <div className={styles.loading}>
      <ReactLoading type="spin" color={colorMode === 'dark' ? "#fff" : '#000'} />
    </div>
  );
}

export default Loading;
