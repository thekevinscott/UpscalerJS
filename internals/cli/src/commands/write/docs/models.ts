import {Flags} from '@oclif/core';
import path from 'path';
import { DOCS_DIR, MODELS_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { writeModelReadmes } from '../../..//lib/commands/write/docs/models.js';
import { verbose } from '@internals/common/logger';
import { info } from 'console';
import { startWatch } from '../../../lib/utils/start-watch.js';
import { BaseCommand } from '../../base-command.js';

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

export default class WriteModelDocs extends BaseCommand<typeof WriteModelDocs> {
  static description = 'Write Model readme documentation'

  static strict = false;

  static flags = {
    watch: Flags.boolean({char: 'w', description: 'Watch mode', default: false}),
    shouldClearMarkdown: Flags.boolean({char: 'm', description: 'Whether to clear markdown or not', default: false}),
  }

  async run(): Promise<void> {
    const { flags: { watch, shouldClearMarkdown } } = await this.parse(WriteModelDocs);
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
  }
}
