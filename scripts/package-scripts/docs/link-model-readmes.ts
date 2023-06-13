/*****
 * Script for linking model readmes locally in docs folder
 */
import path from 'path';
import { copyFile, copy, existsSync, mkdirp, readFile, unlinkSync, writeFile } from 'fs-extra';
import { DOCS_DIR, MODELS_DIR } from '../utils/constants';
import { getAllAvailableModelPackages } from "../utils/getAllAvailableModels";

/****
 * Constants
 */
const GLOBAL_IMAGE_RE = /(?<alt>!\[[^\]]*\])\((?<filename>.*?)(?=\"|\))\)/g;
const IMAGE_FILENAME_RE = /(?<alt>!\[[^\]]*\])\((?<filename>.*?)(?=\"|\))\)/;

/****
 * Utility functions
 */

const createFolderForFile = async (filepath: string) => mkdirp(path.dirname(filepath));

const findImagesInMarkdown = (contents: string) => contents.match(GLOBAL_IMAGE_RE);

const isAbsolutePath = (filepath: string) => {
  return filepath.startsWith('http') || filepath.startsWith('/');
}

const copyAssets = async (packageName: string, targetDir: string) => {
  const packagePath = path.resolve(MODELS_DIR, packageName, 'assets');
  const targetPath = path.resolve(targetDir, packageName);
  await copy(packagePath, targetPath);
}

const createMarkdown = async (contents: string, targetPath: string) => writeFile(targetPath, contents, 'utf-8');

/****
 * Main function
 */
const linkModelReadmes = async () => {
  const packages = getAllAvailableModelPackages();
  for (let i = 0; i < packages.length; i++) {
    const packageName = packages[i];
    const packagePath = path.resolve(MODELS_DIR, packageName);
    const readmePath = path.resolve(packagePath, 'DOC.mdx');
    if (existsSync(readmePath)) {
      const targetAssetDir = path.resolve(DOCS_DIR, `assets/assets/sample-images`);
      const targetDocDir = path.resolve(DOCS_DIR, `docs/models/available`);
      const targetPath = path.resolve(targetDocDir, `${packageName}.mdx`);
      try {
        unlinkSync(targetPath);
      } catch (err) { }
      await copyAssets(packageName, targetAssetDir);
      await createMarkdown(await readFile(readmePath, 'utf-8'), targetPath);
    }
  }
}

/****
 * Functions to expose the main function as a CLI tool
 */

if (require.main === module) {
  (async () => {
    await linkModelReadmes();
  })();
}
