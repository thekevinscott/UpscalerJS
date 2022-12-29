import React, { useMemo } from 'react';
import clsx from 'clsx';
import styles from './examples.module.scss';
import {useColorMode} from '@docusaurus/theme-common';

const EXAMPLE_ROOT = 'https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/docs/src/components/homepage/homepage-code-embed';

export function Examples() {
  const { colorMode } = useColorMode();
  const EXAMPLE_SRC = useMemo(() => `${EXAMPLE_ROOT}?embed=1&ctl=1&file=index.js&hideExplorer=1&theme=${colorMode}`, [
    // colorMode, // switching reloads the whole iframe, which is not ideal.
  ]);

  return (
    <div className={clsx(`${styles.examples}`)}>
      <div className={styles.left}>
        <h2>Examples</h2>
      </div>
      <div className={styles.right}>
        <iframe src={EXAMPLE_SRC}></iframe> 
      </div>
    </div>
  );
}


