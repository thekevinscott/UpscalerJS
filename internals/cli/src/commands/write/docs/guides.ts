import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { DOCS_DIR, EXAMPLES_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { writeGuideDocs } from '../../../lib/commands/write/docs/guides.js';
import { Opts } from './index.js';
import { info, verbose } from '@internals/common/logger';
import { startWatch } from '../../../lib/cli/start-watch.js';

const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/guides');

const writeGuideDocumentation = async ({ shouldClearMarkdown }: Pick<Opts, 'shouldClearMarkdown'>) => {
  info('Writing guides documentation');
  await mkdirp(EXAMPLES_DOCS_DEST);
  if (shouldClearMarkdown) {
    verbose(`Clearing out markdown files in ${EXAMPLES_DOCS_DEST}`)
    await clearOutMarkdownFiles(EXAMPLES_DOCS_DEST);
  }

  return writeGuideDocs(EXAMPLES_DOCS_DEST);
};

export default (program: Command) => program.command('guides')
  .description('Write Guides documentation')
  .action(({ watch, shouldClearMarkdown }: Opts) => {
    if (watch) {
      return startWatch(
        `pnpm cli write docs model ${shouldClearMarkdown ? '-c' : ''}`,
        [
          path.join(EXAMPLES_DIR, '**/*.md'),
        ], {
        persistent: true,
      });
    }
    return writeGuideDocumentation({ shouldClearMarkdown })
  });
