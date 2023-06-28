import React from 'react';
import styles from './modelHeaderImage.module.scss';

interface IProps {
  packageName: string;
  unenhancedSrc: string;
  enhancedSrc: string;
}

export default function ModelHeaderImage ({ unenhancedSrc, enhancedSrc, packageName }: IProps) {
  return (
    <div className={styles.modelHeaderImage}>
      <img src={`/assets/sample-images/${unenhancedSrc}`} alt={`Unenhanced file for ${packageName}`} />
      <img src={`/assets/sample-images/${enhancedSrc}`} alt={`Enhanced file for ${packageName}`} />
    </div>
  );
}

