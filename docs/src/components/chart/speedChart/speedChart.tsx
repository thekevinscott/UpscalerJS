import React from 'react';
import { IProps } from './speedChart/speedChart';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function SpeedChart(props: IProps) {
  return (
    <BrowserOnly>
      {() => {
        const { SpeedChart } = require('@site/src/components/chart/speedChart/speedChart/speedChart');
        return (<SpeedChart {...props} />);
      }}
    </BrowserOnly>
  );
};
