import React, { useMemo } from 'react';
import styles from './badge-label.module.scss';

interface IProps {
  truncated?: boolean;
  icon?: JSX.Element;
  label: string;
}

export const BadgeLabel = ({
  icon,
  label,
  truncated,
}: IProps) => {
  if (truncated) {
    return icon;
  }

  return (
    <span className={styles.badgeLabel}>
      {icon}
      <strong>{label}</strong> :
    </span>
  );
}
