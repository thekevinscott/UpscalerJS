import { bundleEsbuild } from "../lib/esm-esbuild/prepare.mjs";
import { prepareScriptBundleForNodeCJS } from "../lib/node/prepare.mjs";
import { prepareScriptBundleForUMD } from "../lib/umd/prepare.mjs";

const dependencies = {
  model: [
    bundleEsbuild,
    prepareScriptBundleForNodeCJS,
    prepareScriptBundleForUMD,
  ],
};

export default dependencies;
