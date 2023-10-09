import { bundleEsbuild } from "../lib/esm-esbuild/prepare.mjs";

const dependencies = {
  browser: [
    bundleEsbuild,
  ],
};

export default dependencies;
