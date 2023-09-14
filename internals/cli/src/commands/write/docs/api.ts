import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { CLI_DIR, CORE_DIR, DOCS_DIR, UPSCALER_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { writeAPIDocs } from '../../../lib/commands/write/docs/api/index.js';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { startWatch } from '../../../lib/cli/start-watch.js';
import { info } from '@internals/common/logger';

const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/api');

interface Opts {
  shouldClearMarkdown?: boolean;
  watch?: boolean;
}

const writeAPIDocumentation = async ({ shouldClearMarkdown }: Pick<Opts, 'shouldClearMarkdown'>) => {
  await mkdirp(EXAMPLES_DOCS_DEST);
  if (shouldClearMarkdown) {
    await clearOutMarkdownFiles(EXAMPLES_DOCS_DEST);
  }

  return await writeAPIDocs(EXAMPLES_DOCS_DEST);
};

export default (program: Command) => program.command('api')
  .description('Write API documentation')
  .action(async ({ watch, ...opts }: Opts) => {
    if (watch) {
      return startWatch(() => {
        info('Writing API documentation');
        return writeAPIDocumentation(opts);
      }, [
        path.join(CORE_DIR, `**/*`),
        path.join(UPSCALER_DIR, '**/*'),
        path.join(CLI_DIR, 'src/lib/write/docs/api/**/*'),
      ], {
        ignored: path.join(UPSCALER_DIR, '**/*.generated.ts'),
        persistent: true,
      });
    } else {
      writeAPIDocumentation(opts);
    }
  });
