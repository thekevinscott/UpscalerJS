import path from 'path';
import { TEST_DIR } from '@internals/common/constants';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { UMDBundler } from '@internals/bundlers/umd';
import { NodeBundler } from '@internals/bundlers/node';
import { BaseIntegrationTestCommand } from '../../../lib/utils/base-integration-test-command.js';
import { collectStringArgs } from '../../../lib/utils/collect-string-args.js';
import { runTests } from '../../../lib/utils/run-tests.js';

export default class Models extends BaseIntegrationTestCommand<any> {
  static description = 'Test all available models'

  async run(): Promise<void> {
    const { flags } = await this.parse(Models);
    const files = collectStringArgs(this.argv);
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/models/vite.config.ts');
    await runTests(['clientside', 'serverside'], viteConfigPath, [
      EsbuildBundler,
      UMDBundler,
      NodeBundler, 
    ], files, flags);
  }
}
