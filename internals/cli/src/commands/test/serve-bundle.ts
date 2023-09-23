import {Args, Command, Flags} from '@oclif/core';
import { output } from '@internals/common/logger';
import { Bundler, BundlerName, isValidBundlerName } from '@internals/bundlers';
import { HttpServer } from '@internals/http-server';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { UMDBundler } from '@internals/bundlers/umd';
import { NodeBundler } from '@internals/bundlers/node';
import { WebpackBundler } from '@internals/bundlers/webpack';
import { getBundlerOutputDir } from '../../lib/utils/get-bundler-output-dir.js';
import { BaseCommand } from '../base-command.js';

const bundlers: Record<BundlerName, typeof Bundler> = {
  esbuild: EsbuildBundler,
  webpack: WebpackBundler,
  node: NodeBundler,
  umd: UMDBundler,
};

export default class ServeBundle extends BaseCommand<typeof ServeBundle> {
  static description = 'Bundle and serve the content'

  static args = {
    bundlerName: Args.string({required: true, description: 'Bundler to use'}),
  }

  static flags = {
    skipTunnel: Flags.boolean({char: 't', description: 'Whether to use a tunnel or not, which exposes the server to the web', default: false}),
    port: Flags.integer({char: 'p', description: 'Port to run the test server on'}),
  }

  async run(): Promise<void> {
    const { args: { bundlerName }, flags: { port, skipTunnel } } = await this.parse(ServeBundle);
    if (!isValidBundlerName(bundlerName)) {
      throw new Error(`Invalid bundler provided: ${bundlerName}`)
    }
    if (bundlerName === 'node') {
      throw new Error('Serving node bundles is not supported');
    }
    const Bundler = bundlers[bundlerName];
    const bundler = new Bundler(getBundlerOutputDir(Bundler));
    const server = new HttpServer({ port, dist: bundler.absoluteDistFolder, useTunnel: !skipTunnel });
    await server.start();
    process.on('exit', () => server.close());
    const url = await server.url;
    if (!url) {
      throw new Error('Some bug, no URL found')
    }
    output([
      url,
      `- type: ${bundlerName}`,
      `- serving folder: ${server.dist}`,
    ].join('\n'));
  }
}
