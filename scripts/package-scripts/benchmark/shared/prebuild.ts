import buildModels from '../../build-model';
import { getAllAvailableModelPackages } from '../../utils/getAllAvailableModels';
import buildUpscaler from '../../build-upscaler';

const getOutputFormats = (): ('cjs' | 'esm' | 'umd')[] => {
  return ['cjs', 'esm', 'umd'];
}

const platforms = ['node-gpu', 'node', 'browser'];

export const prebuild = async ({
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
    if (verbose) {
      console.log('Building models')
    }
    const outputFormats = getOutputFormats();
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
        `** built models`,
        ...modelPackages.map((modelPackage, i) => `  - ${modelPackage} in ${durations?.[i]} ms`),
      ].join('\n'));
    }
  }

  if (skipBuild !== true) {
    const platformsToBuild: ('browser' | 'node' | 'node-gpu')[] = ['browser', 'node', 'node-gpu'];
    if (verbose) {
      console.log('Building upscaler for platforms', platformsToBuild)
    }

    const durations: number[] = [];
    for (let i = 0; i < platformsToBuild.length; i++) {
      const duration = await buildUpscaler(platformsToBuild[i]);
      durations.push(duration);
    }
    if (verbose) {
      console.log([
        `** built upscaler`,
        ...platformsToBuild.map((platformToBuild, i) => `  - ${platformToBuild} in ${durations?.[i]} ms`),
      ].join('\n'));
    }
  }
};

