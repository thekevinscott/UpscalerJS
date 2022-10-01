import React, { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import styles from './animation.module.scss';

const SIZE = 20;
const PADDING = 20;
const step_speed = 3;
const useAnimate = (canvasRef: MutableRefObject<HTMLCanvasElement>) => {
  const start = useCallback((dir = 1, pos = 0) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const width = canvas.width;
      const height = canvas.height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(PADDING + SIZE + pos, PADDING + SIZE, SIZE, 0, 2 * Math.PI);
      ctx.fill();
      let nextDir = dir;
      if (pos > width - PADDING - (2 * PADDING) - SIZE) {
        nextDir = 0;
      }
      if (pos < PADDING - SIZE) {
        nextDir = 1;
      }
      const nextPos = (dir === 1) ? pos + step_speed : pos - step_speed;
      window.requestAnimationFrame(() => start(nextDir, nextPos));
    }
  }, [canvasRef]);

  useEffect(() => {
    start();
  }, [canvasRef]);
}

export default function Animation() {
  const canvasRef = useRef<HTMLCanvasElement>();
  useAnimate(canvasRef);

  return (
    <div id={styles.animation}>
      <canvas ref={canvasRef} style={{ background: 'white', width: '100%' }} />
    </div>
  );
}
