import { ScaffoldDependenciesConfig, } from "../scripts/package-scripts/scaffold-dependencies.cjs";

const config: ScaffoldDependenciesConfig = {
  files: [
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
