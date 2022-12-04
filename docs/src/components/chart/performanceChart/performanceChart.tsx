import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Chart from '../chart';
import { DropdownMenu } from '../../dropdown/dropdown-menu';
import { SlMenuItem } from '@shoelace-style/shoelace/dist/react';
import styles from '../chart.module.scss';
import classNames from 'classnames';
import { ActiveDataset, Dataset, DATASETS, getDefaultActiveDataset, getDefaultDatasets, getDefaultMetrics, Metric, METRICS } from './utils';
import { usePerformanceQuery } from './usePerformanceQuery';
import { translateResults } from './translateResults';
import { ModelFilter, OnChangeOpts } from '../modelFilter/modelFilter';
import { ModelTooltip } from '../modelTooltip/modelTooltip';
import { BiLinkExternal } from 'react-icons/bi';
import BrowserOnly from '@docusaurus/BrowserOnly';

const DATASET_LINKS: Record<Dataset, string> = {
  'Div2K': 'https://data.vision.ee.ethz.ch/cvl/DIV2K/',
  'FFHQ': 'https://github.com/NVlabs/ffhq-dataset',
  'Flickr2K': 'https://github.com/LimBee/NTIRE2017',
};

const getLinkForDataset = (dataset: Dataset) => DATASET_LINKS[dataset];

interface IProps {
  package?: string;
  databasePath: string;
}

export default function PerformanceChart(props: IProps) {
  return (
    <BrowserOnly>
      {() => <PerformanceChartInner {...props} />}
    </BrowserOnly>
  );
}

const PerformanceChartInner = ({ databasePath, package: packageName }: IProps) => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [metrics, setMetrics] = useState<Metric[]>(getDefaultMetrics(params));
  const [datasets, setDatasets] = useState<Dataset[]>(getDefaultDatasets(params));

  const [activeDataset, setActiveDataset] = useState<ActiveDataset>(getDefaultActiveDataset(params, datasets));
  const [activeModel, setActiveModel] = useState<OnChangeOpts>();
  const data = usePerformanceQuery(databasePath, {
    metrics,
    datasets,
    activeModel,
  }, {
    packageName,
  });

  const setParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
  }, []);

  useEffect(() => {
    setParams('metrics', metrics.join(','));
  }, [setParams, metrics]);

  useEffect(() => {
    setParams('datasets', datasets.join(','));
    if (!datasets.map(d => d.toLowerCase()).includes(activeDataset.dataset)) {
      const opts = {
        dataset: datasets[0].toLowerCase(),
        asc: false,
      };
      setParams('activeDataset', [opts.dataset, opts.asc].join(','));
      setActiveDataset(opts);
    }
  }, [setParams, datasets, activeDataset]);

  const translatedData = useMemo(() => translateResults(data, activeDataset), [data, activeDataset]);
  const options = useMemo(() => {
    return {
      plugins: {
        legend: {
          onClick: (_chart, { datasetIndex }) => {
            const dataset = datasets[datasetIndex].toLowerCase();
            setActiveDataset(prev => {
              const opts = (prev.dataset === dataset) ? {
                dataset,
                asc: !prev.asc,
              } : {
                dataset,
                asc: false,
              };
              setParams('activeDataset', [opts.dataset, opts.asc].join(','));
              return opts;
            });
          }
        },
      },
    }
  }, [datasets, translatedData]);

  const onDatasetChange = useCallback(values => {
    return setDatasets(values.sort());
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.left}>
          {packageName === undefined && <ModelFilter databasePath={databasePath} onChange={setActiveModel} />}
        </div>
        <div className={styles.right}>
          <DropdownMenu title="Datasets" placement="bottom-end" multi onChange={onDatasetChange} defaultValue={datasets} >
            {
              DATASETS.map(option => (
                <SlMenuItem key={option} value={option} checked={datasets.includes(option)}>
                    {option}
                    <a 
                      className={styles.optionLink} 
                      target="_blank" 
                      href={getLinkForDataset(option)}
                    >
                      <BiLinkExternal />
                    </a>
                  </SlMenuItem>
              ))
            }
          </DropdownMenu>
        </div>
      </div>
      <Chart 
        type="bar" 
        title="Performance Benchmarks" 
        data={translatedData}
        options={options}
      >
        {packageName === undefined ? opts => (
          <ModelTooltip model={opts.label} />
        ) : undefined}
      </Chart>
      <small>Performance measurements are done for 100 images of a given dataset. Images are randomly cropped to 240px.</small>
      <div className={classNames({
        [styles.row]: true,
        [styles.center]: true,
      })}>
        <DropdownMenu title="Metrics" onChange={setMetrics} defaultValue={metrics} >
          {METRICS.map(option => (
            <SlMenuItem key={option} value={option} checked={metrics.includes(option)}>{option}</SlMenuItem>
          ))}
        </DropdownMenu>
      </div>
    </div>
  );
}
