import React from 'react';
import styles from './modelCards.module.scss';

interface IProps {
  children: JSX.Element;
}

export default function ModelCards ({
  children,
}: IProps) {
  return (
    <div className={styles.modelCards}>
      {children}
    </div>
  );
};
