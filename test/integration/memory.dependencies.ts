import { bundleEsbuild } from "../lib/esm-esbuild/prepare";

const dependencies = {
  ['test.browser']: [
    bundleEsbuild,
  ],
};

export default dependencies;
