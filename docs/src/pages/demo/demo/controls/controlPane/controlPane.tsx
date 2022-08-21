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
}: {
  children: JSX.Element;
  open: boolean;
  position: Position,
  width?: number;
  height?: number;
}) {
  return (
    <div id={styles.controlPane} className={classNames(getPosition(position))}
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
