import React, { DOMAttributes } from 'react';
import { SlAlert } from '@shoelace-style/shoelace';
import './alert.module.scss';
import { CustomElement } from '@site/src/utils/customElement';

export const Alert = (props) => (<sl-alert {...props} />);

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['sl-alert']: CustomElement<SlAlert>;
    }
  }
}
