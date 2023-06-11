import { dependencies, devDependencies } from '../package.json';
import { loadPackageModels } from './utils';

export const AVAILABLE_PACKAGES = Object.keys({
  ...dependencies,
  ...devDependencies,
}).reduce((set, key) => {
  if (key.includes('@upscalerjs')) {
    const packageName = key.split('@upscalerjs/').pop();
    if (packageName) {
      set.add(packageName);
    }
  }
  return set;
}, new Set<string>());

export const loadAvailableModels = async (packageName: string) => {
  const exports = await loadPackageModels(packageName);
  return Object.keys(exports);
}
