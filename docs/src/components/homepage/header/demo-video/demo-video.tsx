import React from 'react';
import { DemoVideoNav } from './demo-video-nav/demo-video-nav';
import styles from './demo-video.module.scss';
import { useAnimation } from './useAnimation';
import { ExampleImages } from './example-images/example-images';
import { IMAGES } from './images';

const steps = [
  1,
  1000,
  260,
  250,
  4200,
  100,
];

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

export const DemoVideo = () => {
  const {
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
              key={exampleImage.original.src}
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
