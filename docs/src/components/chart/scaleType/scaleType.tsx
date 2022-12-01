import React from 'react';
import styles from './scaleType.module.scss';

export const ScaleType = ({
  toggleScaleType,
}: {
  toggleScaleType: (relative: boolean) => void;
}) => {
  return (
    <div className={styles.scaleType}>
    <div className={styles.scaleTypeInner}>
      <input type="checkbox" id="scaleType" onClick={e => toggleScaleType((e.target as HTMLInputElement).checked)} />
      <label htmlFor="scaleType">Relative Scale</label>

    </div>
    </div>
  )
}
