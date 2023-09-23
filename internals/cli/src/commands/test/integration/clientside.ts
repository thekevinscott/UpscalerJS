import path from 'path';
import { TEST_DIR } from '@internals/common/constants';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { UMDBundler } from '@internals/bundlers/umd';
import { WebpackBundler } from '@internals/bundlers/webpack';
import { BaseIntegrationTestCommand } from '../../../lib/utils/base-integration-test-command.js';
import { runTests } from '../../../lib/utils/run-tests.js';
import { collectStringArgs } from '../../../lib/utils/collect-string-args.js';

export default class Clientside extends BaseIntegrationTestCommand<any> {
  static description = 'Test client side integration tests'

  async run(): Promise<void> {
    const { flags } = await this.parse(Clientside);
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/clientside/vite.config.ts');
    const files = collectStringArgs(this.argv);
    await runTests([
      'clientside',
    ], viteConfigPath, [
      EsbuildBundler,
      UMDBundler,
      WebpackBundler,
    ], files, flags);
  }
}
