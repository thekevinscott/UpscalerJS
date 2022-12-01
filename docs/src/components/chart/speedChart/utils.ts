import { getColors } from '../colors';
import { getActive, isString } from '../utils';

export const DEFAULT_ASC = true;
export const DEFAULT_DEVICE: Device = 'iPhone 14 Pro Max';
export type ActiveDevice = { device: Device, asc: boolean };
export type Device = 'iPad Mini 2021' | 'iPhone 14 Pro Max' | 'iPhone 14' | 'iPhone 12 Mini' | 'iPhone 12 Pro Max' | 'iPad Pro 12.9 2021' | 'Samsung Galaxy S22 Ultra' | 'Samsung Galaxy S22' | 'iPhone 13 Pro Max' | "Google Pixel 6" | "Google Pixel 6 Pro" | 'iPhone 13' | 'Google Pixel 7';
export const DEVICES: Device[] = [
  'iPad Mini 2021',
  'iPhone 14 Pro Max',
  'iPhone 14',
  'iPhone 12 Mini',
  'iPhone 12 Pro Max',
  'iPad Pro 12.9 2021',
  'Samsung Galaxy S22 Ultra',
  'Samsung Galaxy S22',
  'iPhone 13 Pro Max',
  "Google Pixel 6",
  "Google Pixel 6 Pro",
  'iPhone 13',
  'Google Pixel 7',
];

export const COLORS = getColors(DEVICES, 'mpn65');

const isValidDevice = (value?: unknown): value is Device => {
  return isString(value) && DEVICES.includes(value as Device);
};

function getDefaultParams<T extends string>(key: string, filter: (value?: unknown) => value is T, defaultReturn: T[]) {
  return (): T[] => {
    const params: string[] = (new URLSearchParams(window.location.search)).get(key)?.split(',') || [];
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

export const getDefaultDevices = getDefaultParams('devices', isValidDevice, ['iPhone 14 Pro Max'])

export const getDefaultActiveDevice = (): { device: Device; asc: boolean } => {
  const [device, asc] = getActive('activeDevice');
  if (isValidDevice(device) && typeof asc === 'boolean') {
    return {
      device,
      asc,
    };
  }
  return {
    device: DEFAULT_DEVICE,
    asc: DEFAULT_ASC,
  };
}
