import React from 'react';
import { IProps } from './performanceChart/performanceChart';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function PerformanceChart(props: IProps) {
  return (
    <BrowserOnly>
      {() => {
        const { PerformanceChart } = require('@site/src/components/chart/performanceChart/performanceChart/performanceChart');
        return (<PerformanceChart {...props} />);
      }}
    </BrowserOnly>
  );
};
