import React from 'react';
import clsx from 'clsx';
import styles from './features.module.scss';
import scales from '@site/static/img/scales.png';
import models from '@site/static/img/models.png';
import platformSupport from '@site/static/img/platform-support.png';
import documentation from '@site/static/img/documentation.png';
import images from '@site/static/img/images.png';
import flavors from '@site/static/img/flavors.png';

const FeatureList = [
  {
    title: 'Scales to 2x, 3x, and 4x',
    img: scales,
    description: (
      <>
        Scale images up to 4x their original size, all in Javascript.
      </>
    ),
  },
  {
    title: 'Models included',
    img: models,
    description: (
      <>
        UpscalerJS ships with pretrained models in the box covering a wide variety of use cases. Or bring your own!
      </>
    ),
  },
  {
    title: 'Platform Support',
    img: platformSupport,
    description: (
      <>
      Browser, Node (CPU and GPU-accelerated), and Service Worker environments all supported.
      </>
    ),
  },
  ,
  {
    title: 'Images First',
    img: images,
    description: (
      <>
      Supports inputs in a wide variety of formats - URL, HTMLImageElement, and more, and by default exports a base64 upscaled string.
      </>
    ),
  },
  {
    title: 'ESM, CJS, and UMD',
    img: flavors,
    description: (
      <>
      Pick your Javascript flavor! UpscalerJS ships with ESM and UMD (browser) and ESM and CJS (Node).
      </>
    ),
  },
  {
    title: 'Extensive Documentation',
    img: documentation,
    description: (
      <>
      Close to 100% test coverage, Typescript support, examples covering a wide variety of use cases, and thick documentation.
      </>
    ),
  },
];

function Feature({img, title, description}) {
  return (
    <div className={clsx(`col col--4 ${styles.feature}`)}>
      <div className="text--center">
        <img className={styles.img} role="img" src={img} />
      </div>
      <div className="text--left padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function HomepageFeatures() {
  return (
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
  );
}
