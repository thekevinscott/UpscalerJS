import { PerformanceResult } from "./usePerformanceQuery";
import { ActiveDataset, COLORS } from "./utils";

const checkValidValues = (datasetsByObj) => {
  let expectedNum: undefined | number;
  const vals = Object.values(datasetsByObj)
  vals.forEach(values => {
    if (expectedNum === undefined) {
      expectedNum = Object.keys(values).length;
    } else if (expectedNum !== Object.keys(values).length) {
      console.error(vals[0], values)
      throw new Error('Mismatch in results');
    }
  });
}

export const translateResults = (results: PerformanceResult[], { dataset: sortBy, asc = false }: ActiveDataset) => {
  if (!results.length) {
    return {
      labels: [],
      datasets: [],
    };
  }
  const datasetsByObj = results.reduce((datasets, { dataset, ...result }) => {
    const existingDataset = datasets[dataset] || {};
    return {
    ...datasets,
    [dataset]: {
      ...existingDataset,
      [result.model.id]: result,
    },
    };
  }, {} as Record<string, Record<number, PerformanceResult>>);
  checkValidValues(datasetsByObj);
  // if (sortBy !== undefined && datasetsByObj[sortBy] === undefined) {
  //   throw new Error(`Invalid sort by provided: ${sortBy} does not exist in retrieved results`)
  // }
  const datasetSliceToSortBy: Record<string, { value: number, model: PerformanceResult['model'] }> = datasetsByObj[sortBy] ? datasetsByObj[sortBy] : datasetsByObj[results[0].dataset];
  const sortedModelIds = Object.values(datasetSliceToSortBy).sort(({ value: aVal }, { value: bVal }) => {
    if (asc) {
      return aVal - bVal;
    }
    return bVal - aVal;
  }).map(row => row.model.id);
  const datasets = Object.entries(datasetsByObj).map(([datasetName, data]) => {
    const backgroundColor = COLORS[datasetName];
    let label = datasetName;
    if (sortBy === datasetName) {
      label += ` ${asc ? '⬆' : '⬇'}`;
    }
    return {
      label,
      data: sortedModelIds.map(modelId => {
        if (!data[modelId]) {
          throw new Error(`No value found for model id ${modelId} on dataset ${datasetName}`);
        }
        return data[modelId].value;
      }),
      backgroundColor,
      borderWidth: 0,
    }
  });
  const labels = sortedModelIds.map((id) => {
    const { model } = datasetSliceToSortBy[id];
    return [model.package, model.name.split('./').pop()].filter(Boolean).join('/');
  });
  const data = {
    labels,
    datasets,
  };
  return data;
}

