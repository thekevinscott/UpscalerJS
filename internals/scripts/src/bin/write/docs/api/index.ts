import path from 'path';
import { DOCS_DIR, } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { writeAPIDocs } from './lib/write-api-docs.js';
import { info, verbose } from '@internals/common/logger';
import { getSharedArgs } from '../shared/get-shared-args.js';
import { clearOutMarkdownFiles } from '../shared/clear-out-markdown-files.js';

const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/api');

const writeAPIDocumentation = async ({ shouldClearMarkdown }: { shouldClearMarkdown: boolean }) => {
  info('Writing API documentation');
  await mkdirp(EXAMPLES_DOCS_DEST);
  if (shouldClearMarkdown) {
    verbose(`Clearing out markdown files in ${EXAMPLES_DOCS_DEST}`)
    await clearOutMarkdownFiles(EXAMPLES_DOCS_DEST);
  }

  return writeAPIDocs(EXAMPLES_DOCS_DEST);
};


const main = async () => {
  return writeAPIDocumentation(getSharedArgs());
};

main();
