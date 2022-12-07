import { SlMenuItem } from '@shoelace-style/shoelace/dist/react/menu-item';
import { useDatabase } from '@site/src/utils/sqljs';
import React, { useCallback, useEffect, useState } from 'react';
import { DropdownMenu } from '../../dropdown/dropdown-menu';
import styles from './modelFilter.module.scss';

interface Package {
  id: number;
  name: string;
}

function useData<T>(databasePath: string, stmt: string): {
  data?:  T[];
  onChange: (values: string[]) => void;
  selectedItems?: string[];
} {
  const [data, setData] = useState<T[]>();
  const [selectedItems, setSelectedItems] = useState<string[]>();

  const { query } = useDatabase(databasePath);

  const selectData = useCallback(async () => {
    const rows = await query(stmt);
    setData(rows as T[]);
  }, [query]);

  useEffect(() => {
    selectData();
  }, [selectData]);

  const onChange = useCallback((values) => {
    setSelectedItems(values);
  }, []);

  return {
    data,
    onChange,
    selectedItems,
  };
}

const usePackages = (databasePath: string) => {
  const {
    data: availablePackages,
    onChange: setSelectedPackages,
    selectedItems: selectedPackages,
  } = useData<Package>(databasePath, `
    SELECT p.id, p.name FROM packages p GROUP BY p.name
  `)

  useEffect(() => {
    if (availablePackages && selectedPackages === undefined) {
      setSelectedPackages(availablePackages.map(p => p.name));
    }
  }, [selectedPackages, availablePackages]);

  return {
    availablePackages,
    setSelectedPackages,
    selectedPackages,
  };
}

const useScales = (databasePath: string) => {
  const {
    data: availableScales,
    onChange: setSelectedScales,
    selectedItems: selectedScales,
  } = useData<{ scale: number }>(databasePath, `
    SELECT m.scale FROM models m GROUP BY m.scale
  `)

  useEffect(() => {
    if (availableScales && selectedScales === undefined) {
      setSelectedScales(availableScales.map(({ scale }) => `${scale}`));
    }
  }, [selectedScales, availableScales]);

  return {
    availableScales,
    setSelectedScales,
    selectedScales,
  };
}

export interface OnChangeOpts {
  packages: string[];
  scales: string[];
}

export const ModelFilter = ({
  databasePath,
  onChange,
}: {
  databasePath: string;
  onChange: (opts: OnChangeOpts) => void,
}) => {
  const {
    availablePackages,
    setSelectedPackages,
    selectedPackages,
  } = usePackages(databasePath);

  const {
    availableScales,
    setSelectedScales,
    selectedScales,
  } = useScales(databasePath);

  useEffect(() => {
    onChange({
      packages: selectedPackages,
      scales: selectedScales,
    });
  }, [selectedPackages, selectedScales])

  return (
    <div className={styles.modelFilter}>
    {availablePackages && (
      <DropdownMenu title="Packages" allLabel="All Packages" multi onChange={setSelectedPackages} defaultValue={availablePackages.map(p => p.name)}>
        {
          availablePackages.map(({ name }) => (
            <SlMenuItem key={name} value={name} checked={selectedPackages?.includes(name)}>{name}</SlMenuItem>
          ))
        }
      </DropdownMenu>
    )}
    {availableScales && (
      <DropdownMenu title="Scales" allLabel="All Scales" multi onChange={setSelectedScales} defaultValue={availableScales.map(({ scale }) => `${scale}`)}>
        {
          availableScales.map((availableScale) => {
            const scale = `${availableScale.scale}`;
            return (
              <SlMenuItem key={scale} value={scale} checked={selectedScales?.includes(scale)}>{scale}</SlMenuItem>
            );
          })
        }
      </DropdownMenu>

    )}
    </div>
  );
}
