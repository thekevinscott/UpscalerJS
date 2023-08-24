import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { DOCS_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { writeGuideDocs } from '../../../lib/commands/write/docs/guides.js';

const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/guides');

export default (program: Command) => program.command('guides')
  .description('Write Guides documentation')
  .action(async (opts) => {
    await mkdirp(EXAMPLES_DOCS_DEST);
    if ('shouldClearMarkdown' in opts && opts.shouldClearMarkdown) {
      await clearOutMarkdownFiles(EXAMPLES_DOCS_DEST);
    }

    return await writeGuideDocs(EXAMPLES_DOCS_DEST);
  });
