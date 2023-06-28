import React, { useMemo, useState } from 'react';
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
      <img src={originalSrc} alt={`Unenhanced image for ${packageName}`} />
      <img src={enhancedSrc} alt={`Enhanced image for ${packageName}`} />
    </div>
  );
}

