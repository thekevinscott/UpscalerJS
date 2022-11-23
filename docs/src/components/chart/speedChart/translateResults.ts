import { SpeedResult } from "./useSpeedQuery";
import { ActiveDevice, COLORS, Device } from "./utils";

export const translateResults = (results: SpeedResult[], { device: sortBy, asc = false }: ActiveDevice) => {
  if (!results.length) {
    return {
      labels: [],
      datasets: [],
    };
  }
  const devicesByObj = results.reduce((devices, { device, model, ...result }) => {
    const deviceKey = device.device;
    const existingDevice = devices[deviceKey] || {
      device,
      models: {},
    };
    return {
      ...devices,
      [deviceKey]: {
        ...existingDevice,
        models: {
          ...existingDevice.models,
          [model.id]: {
            ...result,
            model,
          },
        }
      },
    };
  }, {} as Record<Device, {
    device: SpeedResult['device'];
    models: Record<number, {
      model: SpeedResult['model'];
      value: number;
      times: number;
    }>;
  }>);
  const { models: deviceSliceToSortBy }: {
    models: Record<number, {
      model: SpeedResult['model'];
      value: number;
      times: number;
    }>
  } = devicesByObj[sortBy] ? devicesByObj[sortBy] : devicesByObj[results[0].device.device];
  const sortedModelIds = Object.values(deviceSliceToSortBy).sort(({ value: aVal }, { value: bVal }) => {
    if (asc) {
      return aVal - bVal;
    }
    return bVal - aVal;
  }).map(row => row.model.id);

  const datasets = Object.values(devicesByObj).map(({ device, models: data }) => {
    const backgroundColor = COLORS[device.device];
    let label = device.device;
    if (sortBy === device.device) {
      label += ` ${asc ? '⬆' : '⬇'}`;
    }
    return {
      label,
      backgroundColor,
      borderWidth: 0,
      data: sortedModelIds.map(modelId => {
        if (!data[modelId]) {
          return 0;
          // throw new Error(`No value found for model id ${modelId} on device ${device.device}`);
        }
        return data[modelId].value;
      }),
    };
  });
  const labels = sortedModelIds.map((id) => {
    const { model } = deviceSliceToSortBy[id];
    return [model.package, model.name.split('./').pop()].filter(Boolean).join('/');
  });
  return {
    labels,
    datasets,
  };
}

