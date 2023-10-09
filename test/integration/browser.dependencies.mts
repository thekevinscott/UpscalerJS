import { bundleEsbuild } from "../lib/esm-esbuild/prepare.mjs";
import { bundleWebpack, prepareScriptBundleForESM } from "../lib/esm-webpack/prepare.mjs";
import { prepareScriptBundleForUMD } from "../lib/umd/prepare.mjs";

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
