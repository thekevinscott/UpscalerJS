import { bundleEsbuild } from "../lib/esm-esbuild/prepare";

const dependencies = {
  browser: [
    bundleEsbuild,
  ],
};

export default dependencies;
