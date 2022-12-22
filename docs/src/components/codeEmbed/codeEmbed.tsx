import React, { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './codeEmbed.module.scss';

const ROOT_URL_STACKBLITZ = 'stackblitz.com/github/thekevinscott/upscalerjs/tree/main';
const ROOT_URL_CODESANDBOX = 'https://githubbox.com/thekevinscott/upscalerjs/tree/main';
const THRESHOLD_TO_GO_MAX = 100;
const IFRAME_DEFAULT_HEIGHT = 300;
const HEADER_HEIGHT = 60;
const MINIMUM_SIZE = 32;

const getRootURL = (type: 'stackblitz' | 'codesandbox') => {
  if (type === 'codesandbox') {
    return ROOT_URL_CODESANDBOX;
  }
  return ROOT_URL_STACKBLITZ;
}

const getParamsWithColorMode = (params: URLSearchParams | string, colorMode: string) => {
  if (typeof params === 'string') {
    return `${params}&theme=${colorMode}`;
  }

  params.set('theme', colorMode);
  return params.toString();
}

const getLocalHeight = (isBrowser: boolean) => {
  return useMemo(() => {
    if (isBrowser) {
      const localHeight = Number(localStorage.getItem('example-height'));
      if (!Number.isNaN(localHeight)) {
        return localHeight;
      }

    }
    return IFRAME_DEFAULT_HEIGHT;
  }, [isBrowser]);
}

const useContainerHeight = (isBrowser: boolean, height: number, delta: number) => {
  return useMemo(() => {
    const containerHeight: number | string = height + delta;
    if (isBrowser && window?.visualViewport) {
      if (window.visualViewport.height - HEADER_HEIGHT - THRESHOLD_TO_GO_MAX < containerHeight) {
        return window.visualViewport.height - HEADER_HEIGHT;
      }
      if (containerHeight < 100) {
        return MINIMUM_SIZE;
      }
    }
    return containerHeight;
  }, [isBrowser, height, delta])
}

const Dragger = ({
  onDrag,
  onDragging,
  text,
}: {
  text: string;
  onDrag: (delta: number) => void;
  onDragging: (dragging: boolean) => void;
}) => {
  const [start, setStart] = useState<number>(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const drag = (e: globalThis.MouseEvent) => {
      if (dragging) {
        const dragAmount = e.clientY - start
        onDrag(dragAmount);
      }
    }

    window.addEventListener('mousemove', drag);
    return () => {
      window.removeEventListener('mousemove', drag);
    }
  }, [dragging, start, onDrag]);

  useEffect(() => {
    const mouseup = () => {
      setDragging(false);
    };

    window.addEventListener('mouseup', mouseup);
    return () => {
      window.removeEventListener('mouseup', mouseup);
    }
  }, []);

  const startDrag = useCallback((e: MouseEvent) => {
    setStart(e.clientY);
    setDragging(true);
  }, []);

  useEffect(() => {
    onDragging(dragging);
  }, [dragging]);

  return (
    <div className={styles.dragger} onMouseDown={startDrag}>{text}</div>
  );
}

const useIFrameSrc = (url: string, params: string, type: 'stackblitz' | 'codesandbox') => {
  const { colorMode } = useColorMode();
  const src = useMemo(() => {
    if (!url) {
      throw new Error('No URL is provided');
    }
    const builtURL = [
      ...getRootURL(type).split('/'),
      ...url.split('/'),
    ].filter(Boolean).join('/');
    return `//${builtURL}?${getParamsWithColorMode(params, colorMode)}`;
  }, [
    url,
    params.toString(),
    colorMode,
    type,
  ]);

}

export const CodeEmbed = ({
  url,
  params = 'embed=1&file=index.js&hideExplorer=1',
  persist,
  type = 'stackblitz',
}: {
  url: string,
  params?: URLSearchParams | string,
  persist?: string;
  type?: 'stackblitz' | 'codesandbox';
}) => {
  const isBrowser = useIsBrowser();
  const ref = useRef<HTMLIFrameElement>(null);
  const src = useIFrameSrc(url, params, type);
  const [height, setHeight] = useState<number>(getLocalHeight(isBrowser));
  const [delta, setDelta] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (dragging === false) {
      setHeight(height + delta);
      setDelta(0);
    }
  }, [dragging]);

  useEffect(() => {
    localStorage.setItem('example-height', `${height}`);
  }, [height]);

  const containerHeight = useContainerHeight(isBrowser, height, delta);

  if (persist) {
    return (
      <div className={styles.container} style={{ height: containerHeight }}>
        {dragging && <div className={styles.overlay}></div>}
        <iframe className={styles.iframe} ref={ref} src={src}></iframe>
        {isBrowser && <Dragger onDragging={setDragging} onDrag={setDelta} text={containerHeight === MINIMUM_SIZE ? 'Drag to expand' : 'Drag to resize'} />}
      </div>
    );
  }

  return (
    <iframe className={styles.iframe} ref={ref} src={src}></iframe>
  )
}

export default CodeEmbed;
