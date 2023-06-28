import React from 'react';
import styles from './modelHeaderImage.module.scss';

interface IProps {
  packageName: string;
  model: string;
}

export default function ModelHeaderImage ({ packageName, model }: IProps) {
  const originalSrc = `/assets/sample-images/${packageName}/fixture.png`;
  const enhancedSrc = `/assets/sample-images/${packageName}/samples/${model}/result.png`;
  return (
    <div className={styles.modelHeaderImage}>
      <img src={originalSrc} alt={`Unenhanced file for ${packageName}`} />
      <img src={enhancedSrc} alt={`Enhanced file for ${packageName}`} />
    </div>
  );
}

