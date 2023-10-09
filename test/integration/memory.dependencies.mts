import { bundleEsbuild } from "../lib/esm-esbuild/prepare.mjs";

const dependencies = {
  ['test.browser']: [
    bundleEsbuild,
  ],
};

export default dependencies;
