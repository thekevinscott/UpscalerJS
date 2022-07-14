import { ScaffoldDependenciesConfig, writeTFJSDependency, } from "../../scripts/package-scripts/scaffold-dependencies";

const config: ScaffoldDependenciesConfig = {
  scaffoldPlatformFiles: true,
  files: [
    {
      name: 'dependencies',
      contents: [
        writeTFJSDependency,
        ({ platform, }) => `export { default as ESRGANSlim } from '@upscalerjs/esrgan-slim${platform === 'node' ? '/node' : ''}';`,
      ],
    },
  ],
};

export default config;
