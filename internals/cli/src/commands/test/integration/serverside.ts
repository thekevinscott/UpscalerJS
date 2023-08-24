import path from 'path';
import { TEST_DIR } from '@internals/common/constants';
import { NodeBundler } from '@internals/bundlers/node';
import { BaseIntegrationTestCommand } from '../../../lib/utils/base-integration-test-command.js';
import { collectStringArgs } from '../../../lib/utils/collect-string-args.js';
import { runTests } from '../../../lib/utils/run-tests.js';

export default class Serverside extends BaseIntegrationTestCommand<typeof BaseIntegrationTestCommand> {
  static description = 'Server side integration tests'

  async run(): Promise<void> {
    const { flags } = await this.parse(Serverside);
    const files = collectStringArgs(this.argv);
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/serverside/vite.config.ts');
    await runTests(['serverside'], viteConfigPath, [NodeBundler], files, flags);
  }
}
