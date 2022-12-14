import React, { useCallback, useEffect, useState } from 'react';
import styles from './demo.module.scss';
import Viewer from './components/viewer/viewer';
import Controls from './controls/controls';
import UploadDialogue from './components/uploadDialogue/uploadDialogue';
import { State } from './types';
import { UploadContext } from './context/uploadContext';
import Warning from './components/warning/warning';
import { useDemoLifecycleState } from './hooks/useDemoLifecycleState';
import { useImages } from './hooks/useImages';
import { ProgressBar } from './components/progressBar/progressBar';
import { useDownload } from './hooks/useDownload';

console.log(styles);

const globalStyle = document.createElement('style');
globalStyle.type = 'text/css';
globalStyle.innerHTML = `
body {
  position: fixed;
  overflow: hidden !important;
  width: 100%;
}
footer {
  display: none;
}
#${styles.page} {
  max-height: 500px;
}
`;

export function Demo() {
  const onResize = useCallback(() => {
    console.log('resize!')
    document.getElementById(styles.page).style.minHeight = `calc(${window.innerHeight}px - 60px)`;
  }, []);
  useEffect(() => {
    const head = document.getElementsByTagName('head')[0];
    head.appendChild(globalStyle);
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, user-scalable=no';
    head.appendChild(meta)
    onResize();

    window.addEventListener('resize', onResize);

    return () => {
      head.removeChild(globalStyle);
      head.removeChild(meta);
      window.removeEventListener('resize', onResize);
    }
  }, []);
  const { 
    upscaledSrc,
    originalSize, 
    downscaledImage, 
    chooseWhichImageToUse, 
    setUploadedImage, 
    img, 
    hasBeenRescaled,
    progress,
    cancelUpscale,
    filename,

    scale,
  } = useImages();

  const { handleDownload } = useDownload(filename, progress, upscaledSrc);

  const lifecycleState = useDemoLifecycleState({
    progress,
    upscaledSrc,
    hasBeenRescaled, 
    img,
  });

  const [zoom, setZoom] = useState(0.75);

  const progressValue = parseInt(`${progress * 100}`, 10);

  return (
    <UploadContext.Provider value={{ handleUpload: setUploadedImage }}>
      <div id={styles.page}>
        {lifecycleState === State.UPLOAD && (
          <UploadDialogue />
        )}
        {lifecycleState === State.WARNING && (
          <Warning 
            img={downscaledImage}
            choose={chooseWhichImageToUse}
            originalSize={originalSize}
          />
        )}
        <Viewer upscaledSrc={upscaledSrc} src={img?.src} zoom={zoom} scale={scale} /> 
        <Controls 
          cancelUpscale={cancelUpscale} 
          selectImage={setUploadedImage} 
          handleZoom={setZoom} 
          zoom={zoom} 
          state={lifecycleState} 
          progress={(
            progress !== undefined && <ProgressBar value={progressValue} label={`${progressValue}%`}>{progressValue}%</ProgressBar>
          )} 
          handleDownload={handleDownload}
        />
      </div>
    </UploadContext.Provider>
  );
}
