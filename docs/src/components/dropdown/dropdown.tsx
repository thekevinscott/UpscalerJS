import React from 'react';
import { CustomElement } from '@site/src/utils/customElement';
import { SlDropdown } from '@shoelace-style/shoelace';

interface IProps {
  placement: SlDropdown['placement'];
  children: JSX.Element | JSX.Element[];
  stayOpenOnSelect?: SlDropdown['stayOpenOnSelect'];
  distance?: SlDropdown['distance'];
}

export const Dropdown = (props: IProps) => {
  return (
    <sl-dropdown
      {...props}
    />
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['sl-dropdown']: CustomElement<SlDropdown>;
    }
  }
}

