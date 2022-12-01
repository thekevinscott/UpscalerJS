import { useColorMode } from '@docusaurus/theme-common';
import { setBasePath } from '@shoelace-style/shoelace';
import { useEffect, useRef } from 'react';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';

setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.0.0-beta.80/dist/');

const SHOELACE_DARK_MODE = 'sl-theme-dark';

const getHTML = () => {
  const els = document.getElementsByTagName('html');
  if (els.length !== 1) {
    throw new Error('Bad selection of HTML element');
  }

  return els[0];
};

export const useShoelaceColorTheme = () => {
  const {colorMode} = useColorMode();
  const { current: html } = useRef(getHTML());
  useEffect(() => {
    if (colorMode === 'dark') {
      html.classList.add(SHOELACE_DARK_MODE);
    } else {
      html.classList.remove(SHOELACE_DARK_MODE);
    }

  }, [html, colorMode]);
}

