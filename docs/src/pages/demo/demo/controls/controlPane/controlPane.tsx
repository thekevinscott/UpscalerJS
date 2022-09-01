import classNames from 'classnames';
import React from 'react';
import styles from './controlPane.module.scss';

type Position = 'right' | 'bottom';

export default function ControlPane({ 
  children,
  open,
  position,
  width,
  height,
  mobile,
  fullHeight,
  assumeHeight,
}: {
  children: JSX.Element;
  open: boolean;
  position: Position,
  width?: number;
  height?: number;
  mobile?: boolean;
  fullHeight?: boolean;
  assumeHeight?: boolean;
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

const getPosition = (position: Position) => {
  return {
    [styles.right]: position === 'right',
    [styles.bottom]: position === 'bottom',
  }
}
