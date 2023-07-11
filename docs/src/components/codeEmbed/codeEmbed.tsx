import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './codeEmbed.module.scss';
import clsx from 'clsx';

const ROOT_URL_STACKBLITZ = 'stackblitz.com/github/thekevinscott/upscalerjs/tree/main';
// const ROOT_URL_CODESANDBOX = 'githubbox.com/thekevinscott/upscalerjs/tree/main';
const ROOT_URL_CODESANDBOX = 'codesandbox.io/embed/github/thekevinscott/upscalerjs/tree/main';
const THRESHOLD_TO_GO_MAX = 100;
const IFRAME_DEFAULT_HEIGHT = 300;
const HEADER_HEIGHT = 60;
const STACKBLITZ_MINIMUM_SIZE = 32;
const CODESANDBOX_MINIMUM_SIZE = 20;

const getMinimumSize = (type: 'codesandbox' | 'stackblitz') => {
  return type === 'codesandbox' ? CODESANDBOX_MINIMUM_SIZE : STACKBLITZ_MINIMUM_SIZE;
}

const getRootURL = (type: 'stackblitz' | 'codesandbox') => {
  if (type === 'codesandbox') {
    return ROOT_URL_CODESANDBOX;
  }
  return ROOT_URL_STACKBLITZ;
}

const getParamsWithColorMode = (params: URLSearchParams | string, colorMode: string): string => {
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

      if (window.innerWidth <= 997) {
        return 0;
      }
    }

    return IFRAME_DEFAULT_HEIGHT;
  }, [isBrowser]);
}

const useContainerHeight = (isBrowser: boolean, height: number, delta: number, minimumSize: number) => {
  return useMemo(() => {
    const containerHeight: number | string = height + delta;
    if (isBrowser && window?.visualViewport) {
      if (window.visualViewport.height - HEADER_HEIGHT - THRESHOLD_TO_GO_MAX < containerHeight) {
        return window.visualViewport.height - HEADER_HEIGHT;
      }
      if (containerHeight < 100) {
        return minimumSize;
      }
    }
    return containerHeight;
  }, [isBrowser, height, delta])
}

const Dragger = ({
  onDrag,
  onDragging,
  text,
  type,
}: {
  type: 'codesandbox' | 'stackblitz';
  text: string;
  onDrag: (delta: number) => void;
  onDragging: (dragging: boolean) => void;
}) => {
  const [start, setStart] = useState<number>(0);
  const [dragging, setDragging] = useState(false);

  const drag = useCallback((clientY: number) => {
    if (dragging) {
      const dragAmount = clientY - start
      onDrag(dragAmount);
    }
  }, [onDrag, start, dragging]);

  useEffect(() => {
    const dragMouse = (e: globalThis.MouseEvent) => {
      drag(e.clientY);
    }

    const dragTouch = (e: globalThis.TouchEvent) => {
      drag(e.touches[0].clientY);
    }

    window.addEventListener('mousemove', dragMouse);
    window.addEventListener('touchmove', dragTouch);
    return () => {
      window.removeEventListener('mousemove', dragMouse);
      window.removeEventListener('touchmove', dragTouch);
    }
  }, [drag]);

  useEffect(() => {
    const mouseup = () => {
      setDragging(false);
    };

    window.addEventListener('mouseup', mouseup);
    window.addEventListener('touchend', mouseup);
    return () => {
      window.removeEventListener('mouseup', mouseup);
      window.removeEventListener('touchend', mouseup);
    }
  }, []);

  const startDrag = useCallback((clientY: number) => {
    setStart(clientY);
    setDragging(true);
  }, []);

  useEffect(() => {
    onDragging(dragging);
  }, [dragging]);

  const onTouchStart = useCallback(e => startDrag(e.touches[0].clientY), [])
  const onMouseDown = useCallback(e => startDrag(e.clientY), []);

  return (
    <div
      className={clsx(styles.dragger, dragging ? styles.active : null, styles[type])} 
      onTouchStart={onTouchStart} 
      onMouseDown={onMouseDown}
      role="button"
    >{text}</div>
  );
}

const useIFrameSrc = (url: string, params: URLSearchParams | string, type: 'stackblitz' | 'codesandbox') => {
  const { colorMode } = useColorMode();
  return useMemo(() => {
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
  params,
  persist,
  type = 'stackblitz',
  large = false,
}: {
  url: string,
  params?: URLSearchParams | string,
  persist?: string;
  type?: 'stackblitz' | 'codesandbox';
  large?: boolean;
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

  const minimumSize = useMemo(() => getMinimumSize(type), [type]);

  const containerHeight = useContainerHeight(isBrowser, height, delta, minimumSize);

  const text = useMemo(() => containerHeight === minimumSize ? 'Drag to expand' : 'Drag to resize', [containerHeight, minimumSize]);

  const iframe = (<iframe
          title="Code Embed"
          className={clsx(styles.iframe, large ? styles.large : null)}
          ref={ref}
          src={src}
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>);

  if (persist) {
    return (
      <div className={clsx(styles.container)} style={{ height: containerHeight }}>
        {dragging && <div className={styles.overlay}></div>}
        {iframe}
        {isBrowser && <Dragger type={type} onDragging={setDragging} onDrag={setDelta} text={text} />}
      </div>
    );
  }

  return iframe;
}

export default CodeEmbed;
