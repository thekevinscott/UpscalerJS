import React, { useMemo } from 'react';
import styles from './scaleType.module.scss';

export const ScaleType = ({
  toggleScaleType,
}: {
  toggleScaleType: (relative: boolean) => void;
}) => {
  const id = useMemo(() => `scaleType-${Math.random()}`, []);
  return (
    <div className={styles.scaleType}>
      <div className={styles.scaleTypeInner}>
        <input type="checkbox" id={id} onClick={e => toggleScaleType((e.target as HTMLInputElement).checked)} />
        <label htmlFor={id}>Relative Y</label>
      </div>
    </div>
  )
}
