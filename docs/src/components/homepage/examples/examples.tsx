import React, { useMemo } from 'react';
import clsx from 'clsx';
import styles from './examples.module.scss';
import Link from '@docusaurus/Link';
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
        <h2>Guides</h2>
        <p>You can play with UpscalerJS right in the browser. Check out the examples to get started:</p>
        <ul>
          <li><Link href="/documentation/guides/browser/basic-npm">Installation Guide for NPM</Link></li>
          <li><Link href="/documentation/guides/browser/basic-umd">Installation Guide for Script Tags</Link></li>
          <li><Link href="/documentation/guides/node/nodejs">Node.js Integration</Link></li>
          <li><Link href="/documentation/guides/browser/models">Working with Models</Link></li>
          <li><Link href="/documentation/guides/browser/upload">Working with Image Uploads</Link></li>
          <li><Link href="/documentation/guides/browser/react">React Integration</Link></li>
        </ul>
        <p><Link href="/documentation/guides">Check out the full list of examples</Link>.</p>
      </div>
      <div className={styles.right}>
        <iframe src={EXAMPLE_SRC}></iframe> 
      </div>
    </div>
  );
}
