import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './modelCard.module.scss';
import ReactMarkdown from 'react-markdown';

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
          {/* <img alt={`Latest version on NPM for @upscalerjs/${packageName}`} src={`https://badge.fury.io/js/@upscalerjs%2F${packageName}.svg`} /> */}
          <img src={`https://img.shields.io/npm/dw/@upscalerjs/${packageName}`} alt={`Downloads per week for @upscalerjs/${packageName}`} />
          <img src={`https://img.shields.io/bundlephobia/min/@upscalerjs/${packageName}`} alt={`Minified file size for @upscalerjs/${packageName}`} />
        </div>
        <div id={styles.buttonContainer}>
        <button>View</button>
        </div>
      </div>
    </Link>
  );
}

