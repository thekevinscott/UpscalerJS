import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './demo.module.scss';
import Viewer from './components/viewer/viewer';
import Controls from './controls/controls';
import UploadDialogue from './components/uploadDialogue/uploadDialogue';
import { State } from './types';
import { UploadContext } from './context/uploadContext';
import Warning from './components/warning/warning';
import { useShoelaceColorTheme } from './hooks/useShoelaceColorTheme';
import { useDemoLifecycleState } from './hooks/useDemoLifecycleState';
import { useImages } from './hooks/useImages';
import { ProgressBar } from './components/progressBar/progressBar';
import { useDownload } from './hooks/useDownload';

export default function Demo() {
  useShoelaceColorTheme();
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
  } = useImages();

  const { handleDownload } = useDownload(filename, progress, upscaledSrc);

  const lifecycleState = useDemoLifecycleState({
    hasBeenRescaled, 
    img,
  });

  const [zoom, setZoom] = useState(.75);

  const progressValue = parseInt(`${progress * 100}`, 10);

  return (
    <UploadContext.Provider value={{ handleUpload: setUploadedImage }}>
      <div id={styles.page}>
        {lifecycleState === State.NOT_STARTED && (
          <UploadDialogue />
        )}
        {lifecycleState === State.WARNING && (
          <Warning 
            img={downscaledImage}
            choose={chooseWhichImageToUse}
            originalSize={originalSize}
          />
        )}
        <Viewer upscaledSrc={upscaledSrc} src={img?.src} zoom={zoom} /> 
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
