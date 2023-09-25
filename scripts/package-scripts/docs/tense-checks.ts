/*****
 * Script for checking tense in docs markdown files
 */
import { sync } from 'glob';
import fsExtra from 'fs-extra';
const { readFile } = fsExtra;
import path from 'path';
import { DOCS_DIR, MODELS_DIR } from '../utils/constants.mjs';
import { getAllAvailableModelPackages } from "../utils/getAllAvailableModels.mjs";

/****
 * Constants
 */

const EXCLUDED_DIRECTORIES = [
  'node_modules',
  'blog',
];

/****
 * Utility functions
 */

const getDocumentationFiles = (): string[] => {
  return sync(path.resolve(DOCS_DIR, `**/*.{md,mdx}`)).filter(file => {
    return EXCLUDED_DIRECTORIES.reduce((include, dir) => {
      return !include ? false : !file.includes(dir);
    }, true);
  });
};

// split a markdown file's contents into two concatenated strings,
// one containing the main content of the file, the other containing
// just the asides
const splitFileContents = (contents: string): [string, string] => {
  const nonAsides = [];
  const asides = [];
  let isAside = false;
  for (const line of contents.split('\n')) {
    if (line.startsWith(':::')) {
      isAside = !isAside;
    } else {
      if (isAside) {
        asides.push(line);
      } else {
        nonAsides.push(line);
      }
    }
  }
  return [nonAsides.join('\n'), asides.join('\n')];
};

// check that a chunk of text matches a specific tense
const checkTense = (contents: string, expectedTense: 'third' | 'second') => {
  if (expectedTense === 'third') {
    // const matches = contents.match(/(Y|y)ou|(Y|y)our|(M|m)ine|(M|m)y/g);
    return contents.match(/\b(I |I'm|me|my|mine|you|your|yours|yourself|yourselves)\b/g);
  } else if (expectedTense === 'second') {
    return contents.match(/\b(I |I'm|me|my|mine|we|us|our|ours|ourselves)\b/g);
  }
  throw new Error(`Unexpected tense: ${expectedTense}`);
}

const checkFileForTense = async (file: string) => {
  const contents = await readFile(file, 'utf-8');
  if (file.includes('documentation/api') || file.includes('troubleshooting')) {
    const matches = checkTense(contents, 'second');
    if (matches !== null) {
      return [
        `Found inconsistent tenses in file ${file}:`,
        '',
        `Main content should be second person, found following keywords: ${matches.join('|')}`,
      ].join('\n');
    }
  } else {
    const [mainContents, asides] = splitFileContents(contents);
    const mainMatches = checkTense(mainContents, 'third');
    const asidesMatches = checkTense(asides, 'second');
    if (mainMatches !== null || asidesMatches !== null) {
      return [
        `Found inconsistent tenses in file ${file}:`,
        '',
        ...(mainMatches !== null ? [
          `Main content should be third person, found following keywords: ${mainMatches.join('|')}`,
        ] : []),
        ...(asidesMatches !== null ? [
          `Asides content should be second person, found following keywords: ${asidesMatches.join('|')}`,
        ] : []),
      ].join('\n');
    }
  }
  return undefined;
}

/****
 * Main function
 */
const tenseChecks = async () => {
  const files = getDocumentationFiles();
  const errors = (await Promise.all(files.map(checkFileForTense))).filter(Boolean);

  if (errors.length) {
    throw new Error(errors.join('\n\n\n'));
  }
}

/****
 * Functions to expose the main function as a CLI tool
 */

if (require.main === module) {
  tenseChecks();
}
