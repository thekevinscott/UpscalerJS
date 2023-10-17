import path from 'path';
import { DOCS_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { writeModelReadmes } from './write-model-readmes.js';
import { verbose } from '@internals/common/logger';
import { info } from 'console';
import { getSharedArgs } from '../shared/get-shared-args.js';
import { clearOutMarkdownFiles } from '../shared/clear-out-markdown-files.js';

const targetDocDir = path.resolve(DOCS_DIR, 'docs/models/available');

const writeModelsDocumentation = async ({ shouldClearMarkdown }: { shouldClearMarkdown: boolean }) => {
  info('Writing models documentation');
  await mkdirp(targetDocDir);
  if (shouldClearMarkdown) {
    verbose(`Clearing out markdown files in ${targetDocDir}`)
    await clearOutMarkdownFiles(targetDocDir);
  }

  return writeModelReadmes(targetDocDir);
};

const main = async () => {
  return writeModelsDocumentation(getSharedArgs());
};

main();
