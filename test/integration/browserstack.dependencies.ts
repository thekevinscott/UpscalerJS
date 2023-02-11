import { bundleEsbuild } from "../lib/esm-esbuild/prepare";
import { bundleWebpack, prepareScriptBundleForESM } from "../lib/esm-webpack/prepare";
import { prepareScriptBundleForUMD } from "../lib/umd/prepare";

const dependencies = {
  browser: [
    bundleEsbuild,
  ],
};

export default dependencies;
