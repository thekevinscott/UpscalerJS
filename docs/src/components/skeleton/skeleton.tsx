import React, { DOMAttributes } from 'react';
import './skeleton.module.scss';
import type { SlSkeleton } from '@shoelace-style/shoelace';
import { CustomElement } from '@site/src/utils/customElement';

interface IProps {
  effect?: SlSkeleton['effect'];
}

export const Skeleton = ({
  effect = 'sheen',
}: IProps) => {
  return (
    <sl-skeleton effect={effect} />
  );
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['sl-skeleton']: CustomElement<SlSkeleton>;
    }
  }
}
