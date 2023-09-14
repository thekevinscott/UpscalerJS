import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { DOCS_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { writeModelReadmes } from '../../../lib/commands/write/docs/models.js';
import chokidar from 'chokidar';

const targetDocDir = path.resolve(DOCS_DIR, 'docs/models/available');

export default (program: Command) => program.command('models')
  .description('Write Model readme documentation')
  .action(async (opts) => {
    await mkdirp(targetDocDir);
    if ('shouldClearMarkdown' in opts && opts.shouldClearMarkdown) {
      await clearOutMarkdownFiles(targetDocDir);
    }

    if ('watch' in opts && opts.watch) {
      const watcher = chokidar.watch([
        '../packages/core/**/*',
        '../packages/upscalerjs/**/*',
        '../internals/cli/src/lib/write/docs/api/**/*',
      ], {
        ignored: '../packages/upscalerjs/**/*.generated.ts',
        persistent: true,
      });
      watcher.on('all', () => writeModelReadmes(targetDocDir));
    } else {
      return await writeModelReadmes(targetDocDir);
    }
  });

