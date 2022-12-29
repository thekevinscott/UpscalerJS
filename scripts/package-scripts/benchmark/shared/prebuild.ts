import buildModels from '../../build-model';
import { getAllAvailableModelPackages } from '../../utils/getAllAvailableModels';
import buildUpscaler from '../../build-upscaler';

const getOutputFormats = (platform: 'node' | 'browser'): ('cjs' | 'esm' | 'umd')[] => {
  return ['cjs'];
}

export const prebuild = async (platform: 'node' | 'browser', {
  packages,
  skipBuild,
  skipModelBuild,
  forceModelRebuild,
  verbose,
}: {
  packages?: string[];
  skipBuild?: boolean;
  skipModelBuild?: boolean;
  forceModelRebuild?: boolean;
  verbose?: boolean;
}) => {
  if (skipModelBuild !== true) {
    const outputFormats = getOutputFormats(platform);
    const modelPackages = getAllAvailableModelPackages().filter(pkg => {
      if (packages === undefined) {
        return true;
      }
      return packages.includes(pkg);
    });
    const durations = await buildModels(modelPackages, outputFormats, {
      verbose,
      forceRebuild: forceModelRebuild,
    });
    if (verbose) {
      console.log([
        `** built models: ${platform}`,
        ...modelPackages.map((modelPackage, i) => `  - ${modelPackage} in ${durations?.[i]} ms`),
      ].join('\n'));
    }
  } else {
    console.log('naw')
  }

  if (skipBuild !== true) {
    const platformsToBuild: ('node' | 'node-gpu')[] = ['node', 'node-gpu'];

    const durations: number[] = [];
    for (let i = 0; i < platformsToBuild.length; i++) {
      const duration = await buildUpscaler(platformsToBuild[i]);
      durations.push(duration);
    }
    if (verbose) {
      console.log([
        `** built upscaler: ${platform}`,
        ...platformsToBuild.map((platformToBuild, i) => `  - ${platformToBuild} in ${durations?.[i]} ms`),
      ].join('\n'));
    }
  }
};

