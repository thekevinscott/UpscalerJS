import { Flags } from '@oclif/core';
import path from 'path';
import { CORE_DIR, DOCS_DIR, UPSCALER_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { writeAPIDocs } from '../../../lib/commands/write/docs/api/index.js';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { info, verbose } from '@internals/common/logger';
import { startWatch } from '../../../lib/utils/start-watch.js';
import { BaseCommand } from '../../base-command.js';

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


export default class WriteAPIDocs extends BaseCommand<typeof WriteAPIDocs> {
  static description = 'Write API documentation'

  static strict = false;

  static flags = {
    watch: Flags.boolean({char: 'w', description: 'Watch mode', default: false}),
    shouldClearMarkdown: Flags.boolean({char: 'm', description: 'Whether to clear markdown or not', default: false}),
  }

  async run(): Promise<void> {
    const { flags: { watch, shouldClearMarkdown } } = await this.parse(WriteAPIDocs);
    if (watch) {
      return startWatch(
        `pnpm cli write docs api ${shouldClearMarkdown ? '-c' : ''}`,
        [
          path.join(CORE_DIR, '**/*'),
          path.join(UPSCALER_DIR, '**/*'),
        ], {
        ignored: path.join(UPSCALER_DIR, '**/*.generated.ts'),
        persistent: true,
      });
    }
    return writeAPIDocumentation({ shouldClearMarkdown });
  }
}
