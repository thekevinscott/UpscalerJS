import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { BiDownload } from 'react-icons/bi';
import styles from './modelCard.module.scss';
import ReactMarkdown from 'react-markdown';
import { useBadges } from './useBadges';
import { formatDistanceToNow } from 'date-fns'

interface IProps {
  packageName: string;
  unenhancedSrc: string;
  enhancedSrc: string;
  description: string;
}

const Description = ({ description }: { description: string }) => (
  <ReactMarkdown>
    {description}
  </ReactMarkdown>
);

export default function ModelCard ({
  packageName,
  unenhancedSrc,
  enhancedSrc,
  description,
}: IProps) {
  const { version, lastUpdated, downloadsPerWeek } = useBadges(packageName);
  return (
     <Link href={`/models/available/${packageName}`} id={clsx(styles.card)}>
       <div id={styles.images}>
         <img src={`/assets/sample-images/${unenhancedSrc}`} alt={`Unenhanced file for ${packageName}`} />
         <img src={`/assets/sample-images/${enhancedSrc}`} alt={`Enhanced file for ${packageName}`} />
       </div>
       <div id={styles.body}>
         <h1>{packageName}</h1>
         <Description description={description} />
      </div>
      <div id={styles.footer}>
        <div id={styles.badges}>
          {version && (<span className={styles.badge}>{version}</span>)}
          {lastUpdated && (<span className={styles.badge}>{formatDistanceToNow(lastUpdated, {})} ago</span>)}
          {downloadsPerWeek !== undefined && (
            <span className={styles.badge}>
              <BiDownload />
              {downloadsPerWeek}
            </span>
          )}
        </div>
        <div id={styles.buttonContainer}>
        <button>View</button>
        </div>
      </div>
    </Link>
  );
}

