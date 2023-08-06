import { useColorMode } from '@docusaurus/theme-common';
import { useEffect, useRef, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';

const SHOELACE_DARK_MODE = 'sl-theme-dark';

const getHTML = (): HTMLElement => {
  const els = document.getElementsByTagName('html');
  if (els.length !== 1) {
    throw new Error('Bad selection of HTML element');
  }
  const html = els[0];

  if (!html) {
    throw new Error('HTML element could not be found')
  }

  return html;
};

const useHTML = () => {
  const isBrowser = useIsBrowser();
  const [html, setHTML] = useState<HTMLElement>();

  useEffect(() => {
    if (isBrowser) {
      setHTML(getHTML());
    } else {
      setHTML(undefined);
    }
  }, [isBrowser]);

  return html;
};

export const useShoelaceColorTheme = () => {
  const { colorMode } = useColorMode();
  const html = useHTML();

  useEffect(() => {
    if (html) {
      // Adding / removing multiple times is fine
      if (colorMode === 'dark') {
        console.log('Adding dark mode');
        html.classList.add(SHOELACE_DARK_MODE);
      } else {
        console.log('Removing dark mode');
        html.classList.remove(SHOELACE_DARK_MODE);
      }
    }
  }, [html, colorMode]);
}

