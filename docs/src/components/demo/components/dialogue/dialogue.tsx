import React from 'react';
import styles from './dialogue.module.scss';

export default function Dialogue({ 
  children, 
}: {
  children: JSX.Element | JSX.Element[];
}) {
  return (
    <div id={styles.container}>
      {children}
    </div>
  );
}

