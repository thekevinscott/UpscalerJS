import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './modelCard.module.scss';
import ReactMarkdown from 'react-markdown';
import Badges from '../badges/badges';

interface IProps {
  packageName: string;
  unenhancedSrc: string;
  enhancedSrc: string;
  description: string;
}

const Description = ({ description }: { description: string }) => (
  <ReactMarkdown disallowedElements={['a']}>
    {description}
  </ReactMarkdown>
);

export default function ModelCard ({
  packageName,
  unenhancedSrc,
  enhancedSrc,
  description,
}: IProps) {
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
        <Badges packageName={packageName} truncated />
        <div id={styles.buttonContainer}>
        <button>View</button>
        </div>
      </div>
    </Link>
  );
}

