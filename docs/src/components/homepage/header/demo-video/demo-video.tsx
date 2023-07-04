import React from 'react';
import { DemoVideoNav } from './demo-video-nav/demo-video-nav';
import styles from './demo-video.module.scss';
import { useAnimation } from './useAnimation';
import { ExampleImages, IExampleImage } from './example-images/example-images';

const IMAGES: IExampleImage[] = [{
  originalSrc: '/assets/homepage-demo/originals/flower.png',
  originalSize: 128,
  originalLabel: 'Upscaled using native bicubic interpolation',

  enhancedSrc: '/assets/homepage-demo/enhanced/flower.png',
  enhancedSize: 256,
  enhancedLabel: 'Upscaled using @upscalerjs/esrgan-thick 4x model',

}, {
  originalSrc: '/assets/homepage-demo/originals/face2.png',
  originalSize: 128,
  originalLabel: 'Upscaled using native bicubic interpolation',

  enhancedSrc: '/assets/homepage-demo/enhanced/face2.png',
  enhancedSize: 256,
  enhancedLabel: 'Upscaled using @upscalerjs/esrgan-thick 4x model',
}, {
  originalSrc: '/assets/homepage-demo/originals/face3.png',
  originalSize: 128,
  originalLabel: 'Upscaled using native bicubic interpolation',

  enhancedSrc: '/assets/homepage-demo/enhanced/face3.png',
  enhancedSize: 256,
  enhancedLabel: 'Upscaled using @upscalerjs/esrgan-thick 4x model',
}, {
  originalSrc: '/assets/homepage-demo/originals/face1.png',
  originalSize: 128,
  originalLabel: 'Upscaled using native bicubic interpolation',

  enhancedSrc: '/assets/homepage-demo/enhanced/face1.png',
  enhancedSize: 256,
  enhancedLabel: 'Upscaled using @upscalerjs/esrgan-thick 4x model',
}];

const steps = [
  1,
  1000,
  260,
  250,
  4200,
  100,
];

export const DemoVideo = () => {
  const {
    activeIdx,
    idx: actualIdx,
    animating,
    handleClick,
  } = useAnimation(steps);

  const totalSteps = steps.length;
  const clippedIdx = actualIdx % (steps.length * IMAGES.length);
  const activeImageIdx = Math.floor(clippedIdx / totalSteps);
  const stepIdx = clippedIdx % totalSteps;

  return (
    <>
      <div className={styles.demos}>
        {IMAGES.map((exampleImage, i) => {
          const exampleStepIdx = getStepIdx({ i, actualIdx, activeImageIdx, stepIdx, totalSteps, totalImages: IMAGES.length });
          return (
            <ExampleImages
              animating={animating}
              stepIdx={exampleStepIdx}
              exampleImage={exampleImage}
              key={JSON.stringify(exampleImage)}
            />
          )
        })}
      </div>
      <DemoVideoNav
        active={activeImageIdx}
        images={IMAGES.length}
        handleClick={handleClick}
      />
    </>
  );
}

const getStepIdx = ({ 
  actualIdx: actualIdx, 
  activeImageIdx: activeIdx, 
  stepIdx,
  totalSteps,
  totalImages,
  i,
}: { 
  actualIdx: number; 
  activeImageIdx: number; 
  stepIdx: number;
  totalSteps: number;
  totalImages: number;
  i: number;
 }) => {
  if (i === activeIdx) {
    return stepIdx;
  }
  if (i === activeIdx - 1) {
    return totalSteps - 1;
  }
  if (actualIdx > 0 && i === totalImages - 1 && stepIdx < 2) {
    return totalSteps - 1;

  }
  return 0;
};
