import {Args, Command, Flags} from '@oclif/core';
import path from 'path';
import { DOCS_DIR, EXAMPLES_DIR } from '@internals/common/constants';
import { mkdirp } from '@internals/common/fs';
import { clearOutMarkdownFiles } from '../../../lib/utils/clear-out-markdown-files.js';
import { writeGuideDocs } from '../../../lib/commands/write/docs/guides.js';
import { info, verbose } from '@internals/common/logger';
import { startWatch } from '../../../lib/utils/start-watch.js';
import { BaseCommand } from '../../base-command.js';

const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/guides');

const writeGuideDocumentation = async ({ shouldClearMarkdown }: { shouldClearMarkdown: boolean }) => {
  info('Writing guides documentation');
  await mkdirp(EXAMPLES_DOCS_DEST);
  if (shouldClearMarkdown) {
    verbose(`Clearing out markdown files in ${EXAMPLES_DOCS_DEST}`)
    await clearOutMarkdownFiles(EXAMPLES_DOCS_DEST);
  }

  return writeGuideDocs(EXAMPLES_DOCS_DEST);
};

export default class WriteGuideDocs extends BaseCommand<typeof WriteGuideDocs> {
  static description = 'Write Guides documentation'

  static strict = false;

  static flags = {
    watch: Flags.boolean({char: 'w', description: 'Watch mode', default: false}),
    shouldClearMarkdown: Flags.boolean({char: 'm', description: 'Whether to clear markdown or not', default: false}),
  }

  async run(): Promise<void> {
    const { flags: { watch, shouldClearMarkdown } } = await this.parse(WriteGuideDocs);
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
  }
}
