// import { ScaffoldDependenciesConfig, writeTFJSDependency, } from "../../scripts/package-scripts/scaffold-dependencies.mts";
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

export type Platform = 'browser' | 'node' | 'node-gpu';

export type TFJSDependency = '@tensorflow/tfjs' | '@tensorflow/tfjs-node' | '@tensorflow/tfjs-node-gpu';

type ContentFn = (arg: {
  tfjs?: TFJSDependency;
  platform?: Platform;
  packageJSON: JSONSchemaForNPMPackageJsonFiles;
}) => string;
export const writeTFJSDependency: ContentFn = ({ tfjs, }) => {
  if (tfjs === undefined) {
    throw new Error('TFJS Platform was undefined');
  }
  return `export * as tf from '${tfjs}';`;
};

const config = {
  scaffoldPlatformFiles: true,
  files: [
    {
      name: 'dependencies',
      contents: [
        writeTFJSDependency,
        () => `export { default as DefaultUpscalerModel } from '@upscalerjs/default-model';`,
      ],
    },
  ],
};

export default config;
