import { prepareScriptBundleForNodeCJS } from "../lib/node/prepare.mjs";

const dependencies = {
  model: [
    prepareScriptBundleForNodeCJS,
  ],
  image: [
    prepareScriptBundleForNodeCJS,
  ],
  platforms: [
    prepareScriptBundleForNodeCJS,
  ],
  speed: [
    prepareScriptBundleForNodeCJS,
  ],
};

export default dependencies;
