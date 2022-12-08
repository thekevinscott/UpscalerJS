import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import GitHubButton from 'react-github-btn'
import styles from './header.module.scss';
import { GoClippy } from 'react-icons/go';

export function HomepageHeader() {
  const [copied, setCopied] = useState(false);

  const copyInstallationInstructions = useCallback(() => {
    navigator.clipboard.writeText('npm install upscaler');
    setCopied(false);
    setCopied(true);
    setTimeout(() => {
      if (setCopied) {
        setCopied(false);
      }
    }, 1000);
  }, []);

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={clsx("row")}>
        <div className={clsx('col col--4')}>
        <h1 className="hero__title">Upscale Images in Javascript</h1>
        <p className="hero__subtitle">Open source, browser/Node compatibility, and completely free to use under the MIT license.</p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/documentation#getting-started">
              Get Started
          </Link>
          <GitHubButton 
          href="https://github.com/thekevinscott/upscalerjs" 
          data-size='large' 
          data-show-count="true" 
          aria-label="Star thekevinscott/upscalerjs on GitHub">Star</GitHubButton>
        </div>
          <code className={clsx(copied ? styles.copied : '')} onClick={copyInstallationInstructions}>npm install upscaler <GoClippy /></code>
        </div>
        <div className={clsx('col col--8')}>
          <img src="/assets/demo.gif" />
        </div>
      </div>
    </header>
  );
}
