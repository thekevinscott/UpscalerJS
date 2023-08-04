/*****
 * Script for linking model readmes locally in docs folder
 */
import path from 'path';
import { copy, existsSync, readFile, unlinkSync, writeFile, writeFileSync } from 'fs-extra';
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

const linkAllModelReadmes = async (packages: string[], targetAssetDir: string, targetDocDir: string) => {
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
};

const getDescription = (readmeContents: string) => {
  const lines = readmeContents.split('\n');
  let description = '';
  let startedDescription = false;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      startedDescription = true;
    } else if (line.startsWith('## ')) {
      startedDescription = false;
      break;
    } else if (!line.startsWith('[!') && startedDescription) {
      description += line;
      if (description) {
        break;
      }
    }
  }
  return description;
};

const getSidebarPosition = (packageName: string, readmeContents: string) => {
  const lines = readmeContents.split('\n');
  for (const line of lines) {
    if (line.startsWith('sidebar_position: ')) {
      const pos = line.split('sidebar_position: ').pop() || '';
      return parseInt(pos, 10);
    }
  }
  throw new Error(`Could not find sidebar position for package name ${packageName}`);
};

const getEnhancedSrc = (packageName: string, readmeContents: string) => {
  const lines = readmeContents.split('\n');
  for (const line of lines) {
    if (line.startsWith('enhanced_src: ')) {
      return line.split('enhanced_src: ').pop() || '';
    }
  }

  throw new Error(`Could not find enhanced_src for package name ${packageName}`);
};

const getPackageMetadata = async (packageName: string) => {
  const packagePath = path.resolve(MODELS_DIR, packageName);
  const readmePath = path.resolve(packagePath, 'DOC.mdx');
  const readmeContents = await readFile(readmePath, 'utf-8');
  return {
    description: getDescription(readmeContents),
    sidebarPosition: getSidebarPosition(packageName, readmeContents),
    enhancedSrc: getEnhancedSrc(packageName, readmeContents),
    unenhancedSrc: `${packageName}/fixture.png`,
  };
};

const writeModelIndexFile = async (packageNames: string[], targetAssetDir: string) => {
  const packages = (await Promise.all(packageNames.filter(packageName => {
    const packagePath = path.resolve(MODELS_DIR, packageName);
    const readmePath = path.resolve(packagePath, 'DOC.mdx');
    return existsSync(readmePath);
  }).map(async (packageName) => ({
    packageName,
    ...(await getPackageMetadata(packageName)),
  })))).sort(({ sidebarPosition: a }, { sidebarPosition: b }) => {
    return a - b;
  });
  const contents = `
---
title: Models
description: An overview of available UpscalerJS Models
sidebar_position: 1
sidebar_label: Overview
pagination_next: null
pagination_prev: null
hide_title: true
---
<a className="docs-link" href="https://upscalerjs.com/models">View this page on the UpscalerJS website</a>

# Models

UpscalerJS offers a number of available models. With the exception of \`default-model\`, these models must be explicitly installed alongside UpscalerJS.

## Upscaling

import ModelCard from '@site/src/components/modelCard/modelCard';

<div id="model-card-container">
${packages.map(({ packageName, description, unenhancedSrc, enhancedSrc } ) => `
<ModelCard 
  packageName="${packageName}" 
  unenhancedSrc="${unenhancedSrc}" 
  enhancedSrc="${enhancedSrc}" 
  description="${description}"
/>
`).join('\n')}
</div>
  `;
  await writeFile(path.resolve(DOCS_DIR, 'docs', 'models', 'index.md'), contents, 'utf-8');
};

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

  await Promise.all([
    linkAllModelReadmes(packages, targetAssetDir, targetDocDir),
    writeModelIndexFile(packages, targetAssetDir),
  ]);
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
