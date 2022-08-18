import React from 'react';
import styles from './pane.module.scss';
import classNames from 'classnames';
console.log(styles);

export default function Pane({
  size,
  classes = {},
  children,
  ...props
}: {
  size: 'small' | 'large';
  classes?: Record<string, boolean>;
  children?: JSX.Element | JSX.Element[];
}) {
  const className = classNames({
    [styles[size]]: true,
    ...classes,
  });
  return (
    <div {...props} id={styles.pane} className={className}>
      {children}
    </div>
  );
}



