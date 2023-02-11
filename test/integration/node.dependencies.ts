import { prepareScriptBundleForNodeCJS } from "../lib/node/prepare";

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
