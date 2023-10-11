import { bundleEsbuild } from "../lib/esm-esbuild/prepare";
import { bundleWebpack, prepareScriptBundleForESM } from "../lib/esm-webpack/prepare";
import { prepareScriptBundleForUMD } from "../lib/umd/prepare";

const dependencies = {
  builds: [
    prepareScriptBundleForUMD,
    prepareScriptBundleForESM,
    bundleWebpack,
  ],
  cdn: [
    bundleEsbuild,
  ],
  image: [
    bundleEsbuild,
  ],
  model: [
    bundleEsbuild,
    prepareScriptBundleForUMD,
  ],
  speed: [
    bundleEsbuild,
  ],
  upscale: [
    bundleEsbuild,
  ],
};

export default dependencies;
