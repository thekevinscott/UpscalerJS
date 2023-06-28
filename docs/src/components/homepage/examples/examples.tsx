import React, { useMemo } from 'react';
import clsx from 'clsx';
import styles from './examples.module.scss';
import Link from '@docusaurus/Link';
import {useColorMode} from '@docusaurus/theme-common';
import CodeEmbed from '../../codeEmbed/codeEmbed';

export function Examples() {
  const { colorMode } = useColorMode();
  const params = useMemo(() => {
    const params = new URLSearchParams();
    params.set('file', 'index.js');
    params.set('ctl', '1');
    params.set('embed', '1');
    params.set('theme', colorMode);
    return params;
  }, []);

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
          <li><Link href="/documentation/guides/browser/implementations/upload">Working with Image Uploads</Link></li>
          <li><Link href="/documentation/guides/browser/implementations/react">React Integration</Link></li>
        </ul>
        <p><Link href="/documentation/guides">Check out the full list of examples</Link>.</p>
      </div>
      <div className={styles.right}>
        <CodeEmbed url={'docs/src/components/homepage/homepage-code-embed'} params={params} type="codesandbox" />
      </div>
    </div>
  );
}
