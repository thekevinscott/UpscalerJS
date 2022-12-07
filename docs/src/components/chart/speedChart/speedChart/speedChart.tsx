import React, { useEffect, useMemo, useState } from 'react';
import Chart, { useSetParams } from '../../chart';
import styles from '../../chart.module.scss';
import { DropdownMenu } from '../../../dropdown/dropdown-menu';
import SlMenuItem from '@shoelace-style/shoelace/dist/react/menu-item';
import { DEFAULT_ASC, Device, DEVICES, getDefaultActiveDevice, getDefaultDevices } from '../utils';
import { useSpeedQuery } from '../useSpeedQuery';
import { translateResults } from '../translateResults';
import { ModelFilter, OnChangeOpts } from '../../modelFilter/modelFilter';
import { ModelTooltip } from '../../modelTooltip/modelTooltip';

export interface IProps {
  package?: string;
  databasePath: string;
}

export function SpeedChart({ databasePath, package: packageName }: IProps) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [devices, setDevices] = useState<Device[]>(getDefaultDevices(params));
  const [activeDevice, setActiveDevice] = useState<{ device: Device, asc: boolean }>(getDefaultActiveDevice(params));
  const [activeModel, setActiveModel] = useState<OnChangeOpts>();
  const data = useSpeedQuery(databasePath, {
    devices,
    activeModel,
  }, {
    packageName
  });

  const translatedData = useMemo(() => translateResults(data , activeDevice), [data, activeDevice]);
  const setParams = useSetParams();

  const options = useMemo(() => {
    return {
      plugins: {
        legend: {
          onClick: (_chart, { datasetIndex: deviceIndex }) => {
            const device = devices[deviceIndex];
            setActiveDevice(prev => {
              const opts = (prev.device === device) ? {
                device,
                asc: !prev.asc,
              } : {
                device,
                asc: DEFAULT_ASC,
              };
              setParams('activeDevice', [opts.device, opts.asc].join(','));
              return opts;
            });
          }
        },
      },
    }
  }, [devices]);

  useEffect(() => {
    setParams('devices', devices.join(','));
    if (!devices.includes(activeDevice.device)) {
      const opts = {
        device: devices[0],
        asc: DEFAULT_ASC,
      };
      setParams('activeDevice', [opts.device, opts.asc].join(','));
      setActiveDevice(opts);
    }
  }, [setParams, devices, activeDevice]);

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.left}>
          {packageName === undefined && <ModelFilter databasePath={databasePath} onChange={setActiveModel} />}
        </div>
        <div className={styles.right}>
          <DropdownMenu multi onChange={setDevices} defaultValue={devices}>
            {
              DEVICES.map(option => (
                <SlMenuItem key={option} value={option} checked={devices.includes(option)}>{option}</SlMenuItem>
              ))
            }
          </DropdownMenu>
        </div>
      </div>
      <Chart 
        title="Speed Benchmarks" 
        type="bar"
        data={translatedData} 
        options={options}
      >
        {packageName === undefined ? opts => (
          <ModelTooltip model={opts.label} />
        ) : undefined}
      </Chart>
      <small>
        All speed measurements are in milliseconds. 
        Each measurement is an average of 1024 iterations: 32 iterations <em>within</em> a browser tab, 
        executed over 32 iterations <em>of</em> a fresh browser tab.
        All models are warmed up before execution.
        Model performance can vary greatly, depending on device and running processes. 
        </small>
    </div>
  );
}
