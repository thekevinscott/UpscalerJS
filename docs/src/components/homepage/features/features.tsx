import React from 'react';
import clsx from 'clsx';
import styles from './features.module.scss';


const FeatureList = [
  {
    title: 'Pretrained Models',
    img: '🎁',
    description: "Enhance images using UpscalerJS's diverse pretrained models, designed to suit various image styles and requirements including increasing image resolution, denoising, deblurring, and more.",
  },
  {
    title: 'Seamless Platform Integration',
    img: '🔌',
    description: "Integrate UpscalerJS across Browser, Node (CPU and GPU), and Workers environments.",
  },
  {
    title: 'Comprehensive Documentation',
    img: '📘',
    description: "Leverage UpscalerJS confidently with extensive documentation, thorough examples, and TypeScript support.",
  },
  {
    title: 'UI-Focused Enhancement',
    img: '🚀',
    description: "Performant UI support with built-in patch-based processing that supports performance without sacrificing quality.",
  },
  {
    title: 'Device Compatibility',
    img: '📱',
    description: "Consistent image enhancement across a variety of devices, including desktops, tablets, and phones.",
  },
  {
    title: 'Custom Model Integration',
    img: '🧩',
    description: "Extend UpscalerJS by integrating your own pretrained models for personalized image enhancements.",
  },
];

function Feature({img, title, description}) {
  return (
    <div className={clsx(`col col--4 ${styles.feature}`)}>
      <div className="text--left padding-horiz--md">
        <h3 className={styles.featureTitle}>
        <span className={styles.featureImg}>{img}</span>
        {title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function HomepageFeatures() {
  return (
      <div className="container">
        <div className="row">
          {FeatureList.map(props => (
            <Feature key={props.title} {...props} />
          ))}
        </div>
      </div>
  );
}
