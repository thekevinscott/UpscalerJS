import React from 'react';
import styles from './badge.module.scss';
import { BadgeLabel } from '../badge-label/badge-label';
import { Skeleton } from '../../skeleton/skeleton';

interface IProps {
  label: string;
  truncated?: boolean;
  children?: boolean | string | JSX.Element | number;
  icon?: JSX.Element;
  description: string;
}

export const Badge = ({
  label,
  truncated,
  children,
  icon,
  description,
}: IProps) => (
  <span className={styles.badge} title={description}>
    <BadgeLabel
      truncated={truncated}
      icon={icon}
      label={label}
    />
    {children || <Skeleton />}
  </span>
);
