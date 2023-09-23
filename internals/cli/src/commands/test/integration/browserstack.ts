import path from 'path';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { TEST_DIR } from '@internals/common/constants';
import { BaseIntegrationTestCommand } from '../../../lib/base-integration-test-command.js';
import { runTests } from '../../../lib/utils/run-tests.js';
import { collectStringArgs } from '../../../lib/utils/collect-string-args.js';


export default class Browserstack extends BaseIntegrationTestCommand<any> {
  static description = 'Test the browserstack suite of tests'

  async run(): Promise<void> {
    const { flags } = await this.parse(Browserstack);
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/browserstack/vite.config.ts');
    if (flags.useTunnel === false) {
      throw new Error('Cannot run browserstack tests without a tunnel');
    }
    const files = collectStringArgs(this.argv);
    await runTests('clientside', viteConfigPath, [EsbuildBundler], files, {
      ...flags,
      useTunnel: true,
    });
  }
}
