import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import GitHubButton from 'react-github-btn'
import styles from './header.module.scss';
import { GoClippy } from 'react-icons/go';
import useIsBrowser from '@docusaurus/useIsBrowser';

const useAgent = () => {
  const isBrowser = useIsBrowser();
  return useMemo(() => {
    if (isBrowser) {
      // https://www.geeksforgeeks.org/how-to-detect-the-user-browser-safari-chrome-ie-firefox-and-opera-using-javascript/
      const userAgentString = window.navigator.userAgent;
      // Detect Chrome
      let chromeAgent = userAgentString.indexOf("Chrome") > -1;

      // Detect Internet Explorer
      let IExplorerAgent = userAgentString.indexOf("MSIE") > -1 || userAgentString.indexOf("rv:") > -1;

      // Detect Firefox
      let firefoxAgent = userAgentString.indexOf("Firefox") > -1;

      // Detect Safari
      let safariAgent = userAgentString.indexOf("Safari") > -1;
            
      // Discard Safari since it also matches Chrome
      if ((chromeAgent) && (safariAgent)) { safariAgent = false; }

      // Detect Opera
      let operaAgent = userAgentString.indexOf("OP") > -1;
            
      // Discard Chrome since it also matches Opera     
      if ((chromeAgent) && (operaAgent)) { chromeAgent = false; }

      if (safariAgent) {
        return 'safari';
      }
      if (firefoxAgent) {
        return 'firefox';
      }
      if (IExplorerAgent) {
        return 'ie';
      }
      if (operaAgent) {
        return 'opera';
      }
      if (chromeAgent) {
        return 'chrome';
      }
    }
    return undefined;
  }, [isBrowser]);
};

const DemoVideo = () => {
  const browser = useAgent();

  if (browser === 'safari') {
    return (
      <img className="demo" src="/assets/demo.mov" />
    );
  }

  return (
    <video autoPlay muted>
      <source src="/assets/demo.mov#t=3" type="video/mp4" />
    </video>
  );
}

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
          <div className={styles.demo}>
            <div className={styles.demoInner}>
              <DemoVideo />
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
