import classNames from 'classnames';
import React from 'react';
import styles from './controlPane.module.scss';

type Position = 'right' | 'bottom';

const getPosition = (position: Position) => {
  return {
    [styles.right]: position === 'right',
    [styles.bottom]: position === 'bottom',
  }
}

export default function ControlPane({ 
  children,
  open,
  position,
  height,
  mobile,
  fullHeight,
  assumeHeight,
  minHeight,
}: {
  children: JSX.Element;
  open: boolean;
  position: Position,
  height?: number;
  mobile?: boolean;
  fullHeight?: boolean;
  assumeHeight?: boolean;
  minHeight?: number,
}) {
  return (
    <div
      id={styles.controlPane}
      className={classNames({
        ...getPosition(position),
        [styles.open]: open,
        [styles.mobile]: mobile,
        [styles.fullHeight]: fullHeight,
        [styles.assumeHeight]: assumeHeight,
      })}
      style={{
        width: height ? (open ? `calc(100% - 200px)` : `calc(100%)`) : undefined,
        minHeight,
      }}
    >
      <div id={styles.controlPaneInner} className={classNames({ [styles.open]: open, ...getPosition(position) })} style={{
        marginBottom: open || !height ? 0 : height * -1,
      }}>
        {children}
      </div>
    </div>
  );
}
