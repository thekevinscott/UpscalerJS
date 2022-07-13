import { ScaffoldDependenciesConfig, writeTFJSDependency, } from "../scripts/package-scripts/scaffold-dependencies";

const config: ScaffoldDependenciesConfig = {
  files: [
    {
      name: 'dependencies',
      contents: [
        writeTFJSDependency,
      ],
    },
    {
      name: 'constants',
      contents: [
        ({ packageJSON: { name = '', }, }) => `export const NAME = "${name}";`,
        ({ packageJSON: { version = '', }, }) => `export const VERSION = "${version}";`,
      ],
    },
  ],
};

export default config;
