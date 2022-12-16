import React, { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './stackBlitz.module.scss';
import clsx from 'clsx';

const ROOT_URL = 'https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main';
const THRESHOLD_TO_GO_MAX = 100;
const HEADER_HEIGHT = 60;

const getParamsWithColorMode = (params: URLSearchParams | string, colorMode: string) => {
  if (typeof params === 'string') {
    return `${params}&theme=${colorMode}`;
  }

  params.set('theme', colorMode);
  return params.toString();
}

export const StackBlitz = ({
  url,
  params = new URLSearchParams(),
  persist,
}: {
  url: string,
  params?: URLSearchParams | string,
  persist?: string;
}) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const { colorMode } = useColorMode();
  const [height, setHeight] = useState(300);
  const [delta, setDelta] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (dragging === false) {
      setHeight(height + delta);
      setDelta(0);
    }
  }, [dragging]);

  const src = useMemo(() => {
    const builtURL = [
      ...ROOT_URL.split('/'),
      ...url.split('/'),
    ].filter(Boolean).join('/');
    return `${builtURL}?${getParamsWithColorMode(params, colorMode)}`;
  }, [
    url,
    params.toString(),
    colorMode,
  ]);

  let containerHeight: number | string = height + delta;
  if (window?.visualViewport && window.visualViewport.height - HEADER_HEIGHT < containerHeight) {
    containerHeight = window.visualViewport.height - HEADER_HEIGHT;
    // containerHeight = `calc(100vh - ${HEADER_HEIGHT}px - 20px)`;
  }

  if (persist) {
    return (
      <div className={styles.container} style={{ height: containerHeight }}>
        {dragging && <div className={styles.overlay}></div>}
        <iframe className={styles.iframe} ref={ref} src={src}></iframe>
        <Dragger onDragging={setDragging} onDrag={setDelta} />
      </div>
    );
  }

  return (
    <iframe className={styles.iframe} ref={ref} src={src}></iframe>
  )
}

const Dragger = ({
  onDrag,
  onDragging,
}: {
  onDrag: (delta: number) => void;
  onDragging: (dragging: boolean) => void;
}) => {
  const [start, setStart] = useState<number>(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const drag = (e: any) => {
      if (dragging) {
        const drag = e.clientY - start
        console.log('drag', drag);
        onDrag(drag);
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

  const stopDrag = useCallback(() => {
  }, []);

  useEffect(() => {
    onDragging(dragging);
  }, [dragging]);

  return (
    <small onMouseDown={startDrag}>Drag to resize</small>
  );
}

export default StackBlitz;
