import React, { useCallback, useEffect, useState } from 'react';
import styles from './configuration.module.scss';
import type { UploadedImage } from '../../types';
import Loading from '@site/src/components/loading/loading';
import Warning from './warning/warning';

const TOO_LARGE = 400;

export default function Configuration({
  img,
}: {
  img: UploadedImage;
}) {
  const [parsedImage, setParsedImage] = useState<HTMLImageElement>();
  const [shouldProceed, setShouldProceed] = useState(false);

  useEffect(() => {
    setShouldProceed(false);
    getImg(img.src).then(setParsedImage);
  }, [img]);

  const handleProceed = useCallback(() => {
    setShouldProceed(true);
  }, [img]);

  if (!parsedImage) {
    return (
      <Loading />
    );
  }

  if (shouldProceed === false && parsedImage.width * parsedImage.height > TOO_LARGE * TOO_LARGE) {
    return (
      <Warning handleProceed={handleProceed} width={parsedImage.width} height={parsedImage.height} />
    );
  }

  return (
    <div id={styles.configuration}>
      <div id={styles.image}>
        <img src={img.src} title={img.filename} alt={img.filename} />
        <small>{img.filename}</small>
      </div>
    </div>
  );
}


