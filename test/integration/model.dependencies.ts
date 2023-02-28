import { bundleEsbuild } from "../lib/esm-esbuild/prepare";
import { prepareScriptBundleForNodeCJS } from "../lib/node/prepare";
import { prepareScriptBundleForUMD } from "../lib/umd/prepare";

const dependencies = {
  model: [
    bundleEsbuild,
    prepareScriptBundleForNodeCJS,
    prepareScriptBundleForUMD,
  ],
};

export default dependencies;
