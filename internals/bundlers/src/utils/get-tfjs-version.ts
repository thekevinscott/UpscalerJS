import path from 'path';
import { ROOT_DIR, } from '@internals/common/constants';
import { getPackageJSON, } from '@internals/common/package-json';

/****
 * The concrete installed @tensorflow/tfjs version, not the peer-dependency
 * range.
 *
 * This value gets interpolated into a CDN `<script src>` in the UMD test page.
 * jsdelivr will serve a semver range, but it resolves one far more slowly than
 * a pinned version — slowly enough to blow the test's page-load budget and time
 * out the beforeEach hook. Reading the installed version also means the tests
 * exercise the version actually in use rather than the bottom of the range.
 */
export const getTFJSVersion = async () => {
  const { version, } = await getPackageJSON(path.resolve(ROOT_DIR, 'node_modules/@tensorflow/tfjs'));
  if (typeof version !== 'string') {
    throw new Error('Could not determine the installed @tensorflow/tfjs version');
  }
  return version;
};
