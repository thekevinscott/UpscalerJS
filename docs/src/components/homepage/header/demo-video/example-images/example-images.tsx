import clsx from 'clsx';
import React, { useMemo } from 'react';
import styles from './example-images.module.scss';

export type ValidExampleImageSize = 128 | 256;
type ValidExampleKind = 'original' | 'enhanced';

export type ValidState = undefined | 'original-image' | 'prepare-for-side-by-side' | 'show-images-side-by-side' | 'show-images-side-by-side-with-label' | 'hide-images';

export const STATES: ValidState[] = [
  undefined,
  'original-image',
  'prepare-for-side-by-side',
  'show-images-side-by-side',
  'show-images-side-by-side-with-label',
  'hide-images',
];

const getStateFromStepIdx = (num: number): ValidState => {
  return STATES[num];
};

export interface IExampleImage {
  originalSrc: string;
  originalLabel: string;
  originalSize: ValidExampleImageSize;
  enhancedSrc: string;
  enhancedLabel: string;
  enhancedSize: ValidExampleImageSize;
}

const getOriginalLabel = (label: string, state: ValidState) => {
  if ([
    'hide-images',
    'show-images-side-by-side-with-label',
  ].includes(state)) {
    return label;
  }
  return 'Original image';
};

const getActiveStyle = (kind: ValidExampleKind, state: ValidState): boolean => {
  if ([
    undefined,
    'hide-images',
  ].includes(state) || (kind === 'enhanced' && [
    'original-image',
    'prepare-for-side-by-side',
  ].includes(state))) {
    return false;
  }

  return true;
}
const getSizeStyle = (state: ValidState, originalSize: number, enhancedSize: number): string => {
  if ([
    undefined,
    'original-image',
    'prepare-for-side-by-side',
    'hide-images',
  ].includes(state)) {
    return styles[`size-${originalSize}`];
  }
  return styles[`size-${enhancedSize}`];
}

const getSideBySide = (state: ValidState): boolean => ![undefined, 'original-image'].includes(state);

const getStateAsStyles = (
  state: ValidState,
  kind: 'original' | 'enhanced',
  originalSize: ValidExampleImageSize,
  enhancedSize: ValidExampleImageSize,
) => {
  const activeStyle = getActiveStyle(kind, state);
  const sizeStyle = getSizeStyle(state, originalSize, enhancedSize);
  const sideBySideStyle = getSideBySide(state);
  return clsx({
    [styles.active]: activeStyle,
    [sizeStyle]: true,
    [styles.sideBySide]: sideBySideStyle,
  });
};

const ExampleImage = ({
  src,
  label,
  originalSize,
  enhancedSize,
  state,
  kind,
  animating,
}: {
  kind: ValidExampleKind;
  src: string;
  label: string;
  originalSize: ValidExampleImageSize;
  enhancedSize: ValidExampleImageSize;
  state: ValidState;
  animating: boolean;
}) => {
  const stateStyle = getStateAsStyles(state, kind, originalSize, enhancedSize);
  return (
    <div className={clsx(styles.imageContainer, styles[kind], animating ? styles.animating : undefined, stateStyle)}>
      <img src={src} className={clsx()} alt={kind} />
      <label className={styles.imageContainerLabel}>{kind === 'original' ? getOriginalLabel(label, state) : label}</label>
    </div>
  );
};

export const ExampleImages = ({
  exampleImage,
  stepIdx,
  animating,
}: {
  exampleImage: IExampleImage;
  stepIdx: number;
  animating: boolean;
}) => {
  const state = getStateFromStepIdx(stepIdx);
  const props = useMemo<{
    src: string;
    label: string;
    kind: ValidExampleKind;
  }[]>(() => [{
    src: exampleImage.originalSrc,
    label: exampleImage.originalLabel,
    kind: 'original',
    }, {
      src: exampleImage.enhancedSrc,
      label: exampleImage.enhancedLabel,
      kind: 'enhanced',
  }], [exampleImage]);
  return (
    <>
      {props.map(({ label, src, kind }) => (
        <ExampleImage 
          key={src}
          animating={animating}
          kind={kind}
          state={state}
          src={src} 
          label={label} 
          originalSize={exampleImage.originalSize}
          enhancedSize={exampleImage.enhancedSize}
        />
      ))}
    </>
  );
}
