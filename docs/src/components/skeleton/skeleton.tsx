import React, { DOMAttributes } from 'react';
import './skeleton.module.scss';
import { SlSkeleton } from '@shoelace-style/shoelace';

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

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['sl-skeleton']: CustomElement<SlSkeleton>;
    }
  }
}
