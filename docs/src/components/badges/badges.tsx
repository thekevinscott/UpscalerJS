import React from 'react';
import { BiDownload } from 'react-icons/bi';
import styles from './badges.module.scss';
import { useBadges } from './useBadges';
import { formatDistanceToNow } from 'date-fns'

interface IProps {
  packageName: string;
  includeCDN?: boolean;
}

export default function Badges ({
  packageName,
  includeCDN = true,
}: IProps) {
  const { version, lastUpdated, downloadsPerWeek } = useBadges(packageName);
  return (
    <div id={styles.badges}>
      {version && (<span className={styles.badge}>{version}</span>)}
      {lastUpdated && (<span className={styles.badge}>{formatDistanceToNow(lastUpdated, {})} ago</span>)}
      {downloadsPerWeek !== undefined && (
        <span className={styles.badge}>
          <BiDownload />
          {downloadsPerWeek}
        </span>
      )}
      {includeCDN && (
        <span className={styles.badge}>
          <a href={`https://www.jsdelivr.com/package/npm/@upscalerjs/${packageName}`}>
            <img src={`https://data.jsdelivr.com/v1/package/npm/@upscalerjs/${packageName}/badge`} />
          </a>
        </span>
      )}
    </div>
  );
}


