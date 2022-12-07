import { useColorMode } from '@docusaurus/theme-common';
import { useEffect, useRef } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';

const SHOELACE_DARK_MODE = 'sl-theme-dark';

const getHTML = () => {
  const els = document.getElementsByTagName('html');
  if (els.length !== 1) {
    throw new Error('Bad selection of HTML element');
  }

  return els[0];
};

export const useShoelaceColorTheme = () => {
  const { colorMode } = useColorMode();
  const isBrowser = useIsBrowser();
  const { current: html } = useRef(isBrowser ? getHTML() : null);
  useEffect(() => {
    if (html) {
      // Adding / removing multiple times is fine
      if (colorMode === 'dark') {
        html.classList.add(SHOELACE_DARK_MODE);
      } else {
        html.classList.remove(SHOELACE_DARK_MODE);
      }
    }
  }, [html, colorMode]);
}

