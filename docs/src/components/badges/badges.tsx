import React from 'react';
import { SlSkeleton } from '@shoelace-style/shoelace/dist/react';
import { BiDownload } from 'react-icons/bi';
import styles from './badges.module.scss';
import { useBadges } from './useBadges';
import { formatDistanceToNow } from 'date-fns'
import { PiTagBold } from 'react-icons/pi';

interface IProps {
  packageName: string;
  truncated?: boolean;
}

const BadgeLabel = ({
  verbose,
  icon,
  label,
}: {
  verbose: boolean;
  icon?: JSX.Element;
  label: string;
}) => {
  if (verbose) {
    return (<PiTagBold />);
  }

  return (<span className="badge-label"><strong>{label}</strong> :</span>);
}

const Badge = ({
  label,
  verbose,
  content,
  icon,
}: {
  label: string;
  verbose: boolean;
  content?: boolean | string | JSX.Element | number;
  icon?: JSX.Element;
}) => (
  <span className={styles.badge}>
    <BadgeLabel
      verbose={verbose}
      icon={icon}
      label={label}
    />
    {content || <SlSkeleton effect='sheen' />}
  </span>
);

export default function Badges ({
  packageName,
  truncated,
}: IProps) {
  const verbose = truncated !== true;
  const { version, lastUpdated, downloadsPerWeek, cdnHits } = useBadges(packageName);
  return (
    <div className={styles.badges}>
      <Badge icon={<PiTagBold />} label="Version" verbose={verbose} content={version} />
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
