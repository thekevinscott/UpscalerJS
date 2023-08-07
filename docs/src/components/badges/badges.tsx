import React, { useMemo } from 'react';
import { SlSkeleton } from '@shoelace-style/shoelace/dist/react';
import styles from './badges.module.scss';
import { useBadges } from './useBadges';
import { formatDistanceToNow } from 'date-fns'
import { BiDownload } from 'react-icons/bi';
import { PiTagBold } from 'react-icons/pi';
import { FiEye } from 'react-icons/fi';
import { FaRegClock } from 'react-icons/fa';
import { TbWeight } from 'react-icons/tb';

interface IProps {
  packageName: string;
  truncated?: boolean;
}

const BadgeLabel = ({
  icon,
  label,
  truncated,
}: {
  truncated?: boolean;
  icon?: JSX.Element;
  label: string;
}) => {
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

const Badge = ({
  label,
  truncated,
  children,
  icon,
  description,
}: {
  label: string;
  truncated?: boolean;
  children?: boolean | string | JSX.Element | number;
  icon?: JSX.Element;
  description: string;
}) => (
  <span className={styles.badge} title={description}>
    <BadgeLabel
      truncated={truncated}
      icon={icon}
      label={label}
    />
    {children || <SlSkeleton effect='sheen' />}
  </span>
);

export default function Badges ({
  packageName,
  truncated,
}: IProps) {
  const { version, lastUpdated, downloadsPerWeek, cdnHits, minifiedSize } = useBadges(packageName);
  const badges = useMemo<{
    label: string;
    content?: boolean | string | JSX.Element | number;
    icon?: JSX.Element;
    description: string;
  }[]>(() => [
    {
      label: 'Version',
      content: version,
      icon: <PiTagBold />,
      description: 'Latest version of the model.',
    },
    {
      label: 'Last Updated',
      content: lastUpdated && `${formatDistanceToNow(lastUpdated, {})} ago`,
      icon: <FaRegClock />,
      description: 'Time since the model was last updated.',
    },
    {
      label: 'NPM installs per week',
      content: downloadsPerWeek,
      icon: <BiDownload />,
      description: 'Number of times the model was installed via NPM last week',
    },
    {
      label: 'CDN hits per week',
      content: cdnHits,
      icon: <FiEye />,
      description: 'Number of times the model was loaded via CDN last week',
    },
    // {
    //   label: 'Bundle size',
    //   content: minifiedSize,
    //   icon: <TbWeight />,
    //   description: 'Minified size of the model.',
    // },
  ].filter(Boolean), [version, lastUpdated, downloadsPerWeek, cdnHits]);
  return (
    <div className={styles.badges}>
      {badges.map(({ description, label, content, icon }) => (
        <Badge
          key={label}
          icon={icon}
          label={label}
          truncated={truncated}
          description={description}
        >
          {content}
        </Badge>
      ))}
    </div>
  );
};
