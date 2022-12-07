import React from 'react';
import { IProps } from './performanceChart/performanceChart';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function PerformanceChartContainer(props: IProps) {
  return (
    <BrowserOnly>
      {() => {
        const { PerformanceChart } = require('@site/src/components/chart/performanceChart/performanceChart/performanceChart'); // skipcq: js-0359
        return (<PerformanceChart {...props} />);
      }}
    </BrowserOnly>
  );
};
