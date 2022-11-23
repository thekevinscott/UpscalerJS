import type { Meta } from '@upscalerjs/core';
import { arrayQuery, useDatabase } from '@site/src/utils/sqljs';
import { useCallback, useEffect, useState } from 'react';
import { OnChangeOpts } from '../modelFilter/modelFilter';
import { Dataset, datasetIdToKey, Metric } from "./utils";

export interface PerformanceResult {
  value: number;
  dataset: Dataset;
  model: {
    id: number;
    name: string;
    package: string;
    packageId: number;
    scale: number;
    meta: Meta;
  }
}

const PERFORMANCE_QUERY = `
  SELECT 
  r.value, 
  e.name as metric,
  d.name as dataset,
  m.id as modelId,
  p.id as packageId,
  m.meta,
  m.name,
  m.scale,
  p.name as package
  FROM results r
  LEFT JOIN metrics e ON r.metricId = e.id
  LEFT JOIN datasets d ON r.datasetId = d.id
  LEFT JOIN models m ON r.modelId = m.id
  LEFT JOIN packages p ON m.packageId = p.id
  WHERE 1=1
`;

export const usePerformanceQuery = (databasePath: string, opts: {
  metrics: Metric[];
  datasets: Dataset[];
  activeModel: OnChangeOpts;
}, {
  packageName,
}: {
  packageName?: string;
}) => {
  const {
    metrics,
    datasets,
    activeModel,
  } = opts;
  const { query } = useDatabase(databasePath);

  const getPerformanceResults = useCallback(async (): Promise<PerformanceResult[]> => {
    if (metrics.length === 0 || datasets.length === 0) {
      return [];
    }
    const packages = (packageName ? [packageName] : activeModel?.packages) || [];

    const hasActivePackages = packages.length > 0;
    const args = [
      ...metrics,
      ...datasets.map(d => datasetIdToKey(d)),
      ...(activeModel?.scales || []),
      ...packages,
    ];
    const stmt = `
    ${PERFORMANCE_QUERY}
    AND metric IN ${arrayQuery(metrics)}
    AND dataset IN ${arrayQuery(datasets)}
    ${activeModel?.scales ? `AND scale IN ${arrayQuery(activeModel.scales)}` : ''}
    ${hasActivePackages ? `AND p.name IN ${arrayQuery(packages)}` : ''}
    ORDER BY p.id ASC, m.id ASC
    `;

    const rows = await query<{
      dataset: Dataset;
      meta: string;
      metric: Metric;
      modelId: number;
      name: string;
      package: string;
      packageId: number;
      scale: number;
      value: number;
    }>(stmt, args);
    return rows.map(({ packageId, modelId, name, package: _packageName, scale, meta, ...row }) => {
      return {
        ...row,
        model: {
          id: modelId,
          packageId,
          name,
          package: _packageName,
          scale,
          meta: JSON.parse(meta),
        },
      };
    });
  }, [query, JSON.stringify(opts), packageName]);

  const [data, setData] = useState<PerformanceResult[]>([]);
  useEffect(() => {
    getPerformanceResults().then(setData);
  }, [getPerformanceResults]);

  return data;
}
