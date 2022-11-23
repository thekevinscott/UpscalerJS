import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TooltipOpts } from "./useTooltip";
import styles from './tooltip.module.scss';
import clsx from 'clsx';

export type ChildrenFn = (tooltip: TooltipOpts) => (JSX.Element | JSX.Element[]);

const TOOLTIP_WIDTH = 442;
const TOOLTIP_HEIGHT = 442;

interface IProps {
 children: ChildrenFn;
 tooltip: TooltipOpts;
}

const getStyle = (_top: number, _left: number) => {
  let top = _top;
  let left = _left;
  let rightArrow = false;
  let bottomArrow = false;
  if (document.body.clientWidth - left < TOOLTIP_WIDTH) {
    rightArrow = true;
    left -= TOOLTIP_WIDTH + 60;
  }
  if (document.body.clientHeight - top < TOOLTIP_HEIGHT) {
    top -= TOOLTIP_HEIGHT - 15;
    bottomArrow = true;
  }

  return {
    rightArrow,
    bottomArrow,
    top,
    left,
  }
}

const TooltipOverlay = ({ setHovering, tooltip, children }: IProps & { setHovering: (hovering: boolean) => void }) => {
  const ref = useRef<HTMLDivElement>();
  const mouseenter = useCallback(() => {
    setHovering(true);
  }, []);

  const mouseleave = useCallback(() => {
    setHovering(false);
  }, []);

  useEffect(() => { // skipcq: JS-0045
    const current = ref.current;
    if (current) {
      current.addEventListener('mouseenter', mouseenter);
      current.addEventListener('mouseleave', mouseleave);

      return () => {
        current.removeEventListener('mouseenter', mouseenter);
        current.removeEventListener('mouseleave', mouseleave);
      };
    }
  }, [ref]);

  const { bottomArrow, rightArrow, ...style } = useMemo(() => getStyle(tooltip.top, tooltip.left), [tooltip.top, tooltip.left]);

  return (
    <div ref={ref} className={styles.tooltip} style={style}>
      <div className={clsx(styles.arrow, rightArrow ? styles.rightArrow : undefined, bottomArrow ? styles.bottomArrow : undefined )}></div>
      {children(tooltip)}
    </div>
  );
}

export const Tooltip = ({ tooltip, children } : IProps) => {
  const [hovering, setHovering] = useState(false);
  const show = hovering || tooltip.opacity !== 0;

  if (show) {
    return (
      <TooltipOverlay setHovering={setHovering} tooltip={tooltip}>{children}</TooltipOverlay> 
    );
  }
  return null;
}
