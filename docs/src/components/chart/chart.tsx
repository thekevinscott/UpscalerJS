import { ColorMode, useColorMode } from '@docusaurus/theme-common';
import { deepMerge } from '@site/src/utils/deepMerge';
import type { ChartData, ChartOptions, PluginChartOptions } from 'chart.js';
import React, { useCallback, useMemo, useState } from 'react';
import { Line, Bar } from './chartjs';
import { ScaleType } from './scaleType/scaleType';
import { ChildrenFn, Tooltip } from './tooltip/tooltip';
import { useTooltip } from './tooltip/useTooltip';
import styles from './chart.module.scss';

interface Opts<T extends CHART_TYPE> {
  data: ChartData<T>;
  title: string;
  type: T;
  options?: ChartOptions<T>;
  plugins?: PluginChartOptions<T>['plugins'];
  children?: ChildrenFn;
}

export type CHART_TYPE = 'line' | 'bar';
const GRID_OPACITY = 0.1;

export const useSetParams = () => {
  const setParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
  }, []);

  return setParams;
};

function getMinMax<T extends CHART_TYPE>({ datasets }: ChartData<T>, padding = 0.02) {
  let min = Infinity;
  let max = -Infinity;

  datasets.forEach(({ data }) => {
    data.forEach(value => {
      if (typeof value !== 'number') {
        throw new Error('Invalid value provided.');
      }
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    });
  });

  return [min * (1 - padding), max * (1 + padding)];
}

export const getDefaultOptions = (colorMode: ColorMode) => {
  const color = colorMode === 'dark' ? 'rgb(227, 227, 227)' : 'rgb(28, 30, 33)';
  const gridColor = colorMode === 'dark' ? `rgba(227, 227, 227, ${GRID_OPACITY})` : `rgba(28, 30, 33, ${GRID_OPACITY})`;
  return {
    elements: {
      bar: {
        borderWidth: 2,
      },
    },
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color,
        },
      },
      title: {
        display: true,
        text: 'Performance Benchmarks',
        color,
      },
    },
    scales: {
      x: {
        grid: {
          color: gridColor,
        },
        ticks: {
          color,
        }
      },
      y: {
        grid: {
          color: gridColor,
        },
        ticks: {
          color,
        }
      }
    }
  };
};

function useOptions<T extends CHART_TYPE>(title: string, relativeScale: boolean, data: ChartData<T>, opts?: ChartOptions<T>): ChartOptions<T> {
  const { colorMode } = useColorMode();
  const options = useMemo<ChartOptions<T>>(() => {
    const defaultOptions = getDefaultOptions(colorMode);
    const [min, max] = relativeScale ? getMinMax<T>(data) : [undefined, undefined];
    return deepMerge(defaultOptions, {
      scales: {
        y: {
          min,
          max,
        },
      },
    }, opts, {
      plugins: {
        title: {
          text: title,
        }
      }
    });
  }, [title, colorMode, opts, relativeScale, JSON.stringify(data)]);

  return options;
}

function SoloChart<T extends CHART_TYPE>({ relativeScale, type, title, options: opts, data, plugins}: Exclude<Opts<T>, 'tooltip'> & {
  relativeScale: boolean;
}) {
  const options = useOptions<T>(title, relativeScale, data, opts);

  if (type === 'line') {
    return (
      <Line
        options={options}
        data={data}
        plugins={plugins}
      />
    );
  }

  return (
    <Bar
      options={options}
      data={data}
      plugins={plugins}
    />
  );
}

export default function Chart<T extends CHART_TYPE>({ children, ...opts }: Opts<T>) {
  const [ tooltip, tooltipCallback ] = useTooltip();
  const hasTooltip = Boolean(children);
  const [relativeScale, setRelativeScale] = useState(false);
  return (
    <div className={styles.chart}>
      <ScaleType toggleScaleType={setRelativeScale} />
      {hasTooltip && (<Tooltip tooltip={tooltip}>{children}</Tooltip>)}
      <SoloChart
        {...opts}
        relativeScale={relativeScale}
        options={deepMerge(opts.options, hasTooltip ? {
          plugins: {
            tooltip: {
              enabled: false,
              external: tooltipCallback,
            },
          },
        } : {})}
      />
    </div>
  );
}
