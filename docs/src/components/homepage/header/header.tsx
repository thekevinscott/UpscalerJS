import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import GitHubButton from 'react-github-btn';
import styles from './header.module.scss';
import { GoClippy } from 'react-icons/go';
import { DemoVideo } from './demo-video/demo-video';
import BrowserOnly from '@docusaurus/BrowserOnly';

export function HomepageHeader() {
  const [copied, setCopied] = useState(false);

  const copyInstallationInstructions = useCallback(() => {
    navigator.clipboard.writeText('npm install upscaler');
    setCopied(false);
    setCopied(true);
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
    }
  }, []);

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
          <BrowserOnly fallback={<div>Loading...</div>}>
      {() => {
        return (
          <>
      <div className={clsx("row")}>
        <div className={clsx('col col--4')}>
        <h1 className="hero__title">Enhance Images with AI using Javascript</h1>
        <p className="hero__subtitle">Open source, browser/Node compatibility, and completely free to use under the MIT license.</p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/documentation/getting-started">
              Get Started
          </Link>
          <GitHubButton 
            href="https://github.com/thekevinscott/upscalerjs" 
            data-size='large' 
            data-show-count="true" 
            aria-label="Star thekevinscott/upscalerjs on GitHub">Star</GitHubButton>
        </div>
        <code className={clsx(copied ? styles.copied : '')}>
          <button onClick={copyInstallationInstructions}>
          npm install upscaler <GoClippy />
          </button>
          </code>
        </div>
        <div className={clsx('col col--8')}>
          <div className={styles.demo}>
          <BrowserOnly fallback={<div>Loading...</div>}>
      {() => {
        return (
          <>
            <DemoVideo />
          </>
        );
      }}
    </BrowserOnly>
          </div>
        </div>
      </div>
          </>
        );
      }}
    </BrowserOnly>
    </header>
  );
}
