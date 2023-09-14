import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { DOCS_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { writeModelReadmes } from '../../../lib/commands/write/docs/models.js';

const targetDocDir = path.resolve(DOCS_DIR, 'docs/models/available');

export default (program: Command) => program.command('models')
  .description('Write Model readme documentation')
  .action(async (opts) => {
    await mkdirp(targetDocDir);
    if ('shouldClearMarkdown' in opts && opts.shouldClearMarkdown) {
      await clearOutMarkdownFiles(targetDocDir);
    }

    return await writeModelReadmes(targetDocDir);
  });

