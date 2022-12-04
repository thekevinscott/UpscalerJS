import { getColors } from "../colors";
import { getActive, isString } from "../utils";

export type ActiveDataset = { dataset: string; asc?: boolean };
export type Metric = 'PSNR' | 'SSIM';
export type Dataset = 'Div2K' | 'FFHQ' | 'Flickr2K';
export const METRICS: Metric[] = ['PSNR', 'SSIM'];
export const DATASETS: Dataset[] = ['Div2K', 'FFHQ', 'Flickr2K'];

export const datasetIdToKey = (dataset: Dataset) => dataset.toLowerCase();

export const COLORS = getColors(DATASETS.map(datasetIdToKey), 'mpn65', 2);

const isValidMetric = (value?: unknown): value is Metric => {
  return isString(value) && METRICS.includes(value as Metric);
};
const isValidDataset = (value?: unknown): value is Dataset => {
  return isString(value) && DATASETS.includes(value as Dataset);
};

function getDefaultParams<T extends string>(
  key: string, 
  filter: (value?: unknown) => value is T, 
  defaultReturn: T[]
) {
  return (urlSearchParams: URLSearchParams): T[] => {
    const params: string[] = urlSearchParams.get(key)?.split(',') || [];
    const values: T[] = [];
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      if (filter(param)) {
        values.push(param as T);
      }
    }
    if (values.length) {
      return values;
    }
    return defaultReturn;
  }
}

export const getDefaultMetrics = getDefaultParams('metrics', isValidMetric, ['PSNR'])
export const getDefaultDatasets = getDefaultParams('datasets', isValidDataset, ['Div2K'])
export const getDefaultActiveDataset = (params: URLSearchParams, datasets: Dataset[]): ActiveDataset => {
  const [dataset, asc] = getActive(params, 'activeDataset');
  if (isValidDataset(dataset) && typeof asc === 'boolean') {
    return {
      dataset: datasetIdToKey(dataset),
      asc,
    };
  }
  return {
    dataset: datasetIdToKey(datasets[0]),
    asc: false,
  };
}
