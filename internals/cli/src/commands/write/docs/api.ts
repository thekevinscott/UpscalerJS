import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { DOCS_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { writeAPIDocs } from '../../../lib/commands/write/docs/api.js';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';

const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/api');

export default (program: Command) => program.command('api')
  .description('Write API documentation')
  .action(async (opts) => {
    await mkdirp(EXAMPLES_DOCS_DEST);
    if ('shouldClearMarkdown' in opts && opts.shouldClearMarkdown) {
      await clearOutMarkdownFiles(EXAMPLES_DOCS_DEST);
    }

    return await writeAPIDocs(EXAMPLES_DOCS_DEST);
  });
