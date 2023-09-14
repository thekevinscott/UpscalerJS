import { ROOT_DIR } from '@internals/common/constants';
import { getPackageJSON } from '@internals/common/package-json';

export const getTFJSVersion = async () => {
  const { peerDependencies = {}, } = await getPackageJSON(ROOT_DIR);
  return peerDependencies['@tensorflow/tfjs'];
}
