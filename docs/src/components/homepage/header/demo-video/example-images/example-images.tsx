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

interface IExampleImageSlice {
  src: string;
  labels: {
    short: string;
    long: string;
  };
}

export interface IExampleImage {
  original: IExampleImageSlice;
  enhanced: IExampleImageSlice;
  sizes: {
    original: ValidExampleImageSize;
    enhanced: ValidExampleImageSize;
  }
}

const getOriginalLabel = (label: string, state: ValidState, short = false) => {
  if ([
    'hide-images',
    'show-images-side-by-side-with-label',
  ].includes(state)) {
    return label;
  }
  return short ? 'Original' : 'Original image';
};

const getActiveStyle = (kind: ValidExampleKind, state: ValidState): boolean => {
  return !([
    undefined,
    'hide-images',
  ].includes(state) || (kind === 'enhanced' && [
    'original-image',
    'prepare-for-side-by-side',
  ].includes(state)));
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
  labels,
  originalSize,
  enhancedSize,
  state,
  kind,
  animating,
}: {
  kind: ValidExampleKind;
  src: string;
  labels: {
    long: string;
    short: string;
  };
  originalSize: ValidExampleImageSize;
  enhancedSize: ValidExampleImageSize;
  state: ValidState;
  animating: boolean;
}) => {
  const stateStyle = getStateAsStyles(state, kind, originalSize, enhancedSize);
  return (
    <div className={clsx(styles.imageContainer, styles[kind], animating ? styles.animating : undefined, stateStyle)}>
      <img src={src} className={clsx()} alt={kind} />
      {[{
         label: labels.long,
         cls: styles.longLabel,
         isShort: false,
        }, {
         label: labels.short,
         cls: styles.shortLabel,
         isShort: true,
        }].map(({ label, cls, isShort }) => (
        <label 
          key={label}
          className={clsx(cls, styles.imageContainerLabel)}
        >
          {kind === 'original' ? getOriginalLabel(label, state, isShort) : label}
        </label>
      ))}
    </div>
  );
};

export const ExampleImages = ({
  exampleImage: {
    original,
    enhanced,
    sizes: {
      original: originalSize,
      enhanced: enhancedSize,
    },
  },
  stepIdx,
  animating,
}: {
  exampleImage: IExampleImage;
  stepIdx: number;
  animating: boolean;
}) => {
  const state = getStateFromStepIdx(stepIdx);
  const props: (IExampleImageSlice & { kind: ValidExampleKind })[] = [{ ...original, kind: 'original' }, { ...enhanced, kind: 'enhanced' }];
  return (
    <>
      {props.map(({ labels, src, kind }) => (
        <ExampleImage 
          key={src}
          animating={animating}
          kind={kind}
          state={state}
          src={src} 
          labels={labels} 
          originalSize={originalSize}
          enhancedSize={enhancedSize}
        />
      ))}
    </>
  );
}
