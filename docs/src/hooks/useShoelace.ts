import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useEffect } from 'react';

export const useShoelace = () => {
  const isBrowser = useIsBrowser();

  useEffect(() => {
    if (isBrowser) {
      setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.0.0-beta.80/dist/');
    }
  }, [isBrowser]);
};
