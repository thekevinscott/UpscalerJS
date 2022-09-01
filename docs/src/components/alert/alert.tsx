import React from 'react';
import { SlAlert } from '@shoelace-style/shoelace/dist/react';
import './alert.module.scss';

export const Alert = (props) => {
  return <SlAlert {...props} />;
}
