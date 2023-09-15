import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { CORE_DIR, DOCS_DIR, MODELS_DIR, UPSCALER_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { writeModelReadmes } from '../../../lib/commands/write/docs/models.js';
import { startWatch } from '../../../lib/cli/start-watch.js';
import { Opts } from './index.js';
import { verbose } from '@internals/common/logger';
import { info } from 'console';

const targetDocDir = path.resolve(DOCS_DIR, 'docs/models/available');

const writeModelsDocumentation = async ({ shouldClearMarkdown }: Pick<Opts, 'shouldClearMarkdown'>) => {
  info('Writing models documentation');
  await mkdirp(targetDocDir);
  if (shouldClearMarkdown) {
    verbose(`Clearing out markdown files in ${targetDocDir}`)
    await clearOutMarkdownFiles(targetDocDir);
  }

  return writeModelReadmes(targetDocDir);
};

export default (program: Command) => program.command('models')
  .description('Write Model readme documentation')
  .action(({ watch, shouldClearMarkdown }: Opts) => {
    if (watch) {
      return startWatch(
        `pnpm cli write docs model ${shouldClearMarkdown ? '-c' : ''}`,
        [
          path.join(MODELS_DIR, '**/*.md'),
        ], {
        persistent: true,
      });
    }
    return writeModelsDocumentation({ shouldClearMarkdown });
  });

