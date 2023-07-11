import clsx from 'clsx';
import React from 'react';
import styles from './modelHeaderImage.module.scss';

interface IProps {
  packageName: string;
  unenhancedSrc: string;
  enhancedSrc: string;
  oversized?: boolean;
}

export default function ModelHeaderImage ({ unenhancedSrc, enhancedSrc, packageName, oversized }: IProps) {
  return (
    <div className={clsx(styles.modelHeaderImage, oversized ? styles.oversized : null)}>
      <img src={`/assets/sample-images/${unenhancedSrc}`} alt={`Unenhanced file for ${packageName}`} />
      <img src={`/assets/sample-images/${enhancedSrc}`} alt={`Enhanced file for ${packageName}`} />
    </div>
  );
}

