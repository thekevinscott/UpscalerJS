import type * as Shoelace from '@shoelace-style/shoelace/dist/react';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useCallback, useEffect, useState } from 'react';

export const useShoelace = () => {
  const isBrowser = useIsBrowser();
  const [shoelace, setShoelace] = useState<{
    SlDropdown?: typeof Shoelace['SlDropdown'];
    SlMenu?: typeof Shoelace['SlMenu'];
    SlButton?: typeof Shoelace['SlButton'];
    SlMenuItem?: typeof Shoelace['SlMenuItem'];
  }>({});

  const loadShoelacePiece = useCallback(async (pathname: string, key: string) => {
    const piece = await import(`@shoelace-style/shoelace/dist/react/${pathname}/index.js`);
    setShoelace(prev => ({
      ...prev,
      [key]: piece,
    }));
  }, []);

  useEffect(() => {
    if (isBrowser) {
      setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.0.0-beta.80/dist/');
      [
        ['dropdown', 'SlDropdown'],
        ['menu', 'SlMenu'],
        ['menu-item', 'SlMenuItem'],
        ['button', 'SlButton'],
      ].forEach(([pathname, key]) => {
        loadShoelacePiece(pathname, key);
      });
    }
  }, [isBrowser]);

  return shoelace;
}
