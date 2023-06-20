/*****
 * Script for linking model readmes locally in docs folder
 */
import path from 'path';
import { copy, existsSync, readFile, unlinkSync, writeFile } from 'fs-extra';
import { DOCS_DIR, MODELS_DIR } from '../utils/constants';
import { getAllAvailableModelPackages } from "../utils/getAllAvailableModels";
import { getSharedArgs, SharedArgs } from './types';
import { clearOutMarkdownFiles } from './utils/clear-out-markdown-files';

/****
 * Utility functions
 */

const copyAssets = async (packageName: string, targetDir: string) => {
  const packagePath = path.resolve(MODELS_DIR, packageName, 'assets');
  const targetPath = path.resolve(targetDir, packageName);
  await copy(packagePath, targetPath);
}

const createMarkdown = async (contents: string, targetPath: string) => writeFile(targetPath, contents, 'utf-8');

/****
 * Main function
 */
const linkModelReadmes = async ({ shouldClearMarkdown }: SharedArgs = {}) => {
  const packages = getAllAvailableModelPackages();
  const targetAssetDir = path.resolve(DOCS_DIR, `assets/assets/sample-images`);
  const targetDocDir = path.resolve(DOCS_DIR, `docs/models/available`);
  if (shouldClearMarkdown) {
    await clearOutMarkdownFiles(targetDocDir);
  }
  for (let i = 0; i < packages.length; i++) {
    const packageName = packages[i];
    const packagePath = path.resolve(MODELS_DIR, packageName);
    const readmePath = path.resolve(packagePath, 'DOC.mdx');
    if (existsSync(readmePath)) {
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
    const sharedArgs = await getSharedArgs();
    await linkModelReadmes({ ...sharedArgs });
  })();
}
