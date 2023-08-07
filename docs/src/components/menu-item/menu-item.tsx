import React, { DOMAttributes } from 'react';
// import './menu-item.module.scss';
import type { SlMenuItem } from '@shoelace-style/shoelace';

type IProps = Partial<Pick<SlMenuItem, 'value' | 'checked' | 'menuItem' | 'type' | 'disabled'> & {
  children: any;
}>;

export const MenuItem = ({
  children,
  value,
  checked,
  type,
}: IProps) => {
  return (
    <sl-menu-item type={type} value={value} checked={checked}>{children}</sl-menu-item>
  );
};

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['sl-menu-item']: CustomElement<SlMenuItem>;
    }
  }
}
