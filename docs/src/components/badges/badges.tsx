import React from 'react';
import { SlSkeleton } from '@shoelace-style/shoelace/dist/react';
import { BiDownload } from 'react-icons/bi';
import styles from './badges.module.scss';
import { useBadges } from './useBadges';
import { formatDistanceToNow } from 'date-fns'

interface IProps {
  packageName: string;
  truncated?: boolean;
}

const Badge = ({
  label,
  verbose,
  content,
}: {
  label: string;
  verbose: boolean;
  content?: boolean | string | JSX.Element | number;
}) => {
  if (content !== undefined && content !== false) {
    if (verbose) {
      return (<span className={styles.badge}><strong>{label}</strong>: {content}</span>);
    }
    return (<span className={styles.badge}>{content}</span>);
  }

  return (
    <span className={styles.badge}>
      <strong>{label}</strong>:
      <SlSkeleton effect='sheen' />
    </span>
  );
};

export default function Badges ({
  packageName,
  truncated,
}: IProps) {
  const verbose = truncated !== true;
  const { version, lastUpdated, downloadsPerWeek, cdnHits } = useBadges(packageName);
  return (
    <div id={styles.badges}>
      <Badge label="Version" verbose={verbose} content={version} />
      <Badge label="Last Updated" verbose={verbose} content={lastUpdated && `${formatDistanceToNow(lastUpdated, {})} ago`} />
      <Badge
        label="Downloads per week"
        verbose={verbose}
        content={downloadsPerWeek !== undefined && verbose ? downloadsPerWeek : (
          <>
            <BiDownload />
            {downloadsPerWeek}
          </>
        )}
      />
      {verbose && (<Badge
        label="CDN hits per week"
        verbose={verbose}
        content={cdnHits}
      />)}
    </div>
  );
};
