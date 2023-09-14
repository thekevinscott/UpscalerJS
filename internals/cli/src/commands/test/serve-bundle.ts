import { Command, InvalidArgumentError } from '@commander-js/extra-typings';
import { output } from '@internals/common/logger';
import { Bundler, BundlerName, isValidBundlerName } from '@internals/bundlers';
import { HttpServer } from '@internals/http-server';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { UMDBundler } from '@internals/bundlers/umd';
import { NodeBundler } from '@internals/bundlers/node';
import { getBundlerOutputDir } from '../../lib/utils/get-bundler-output-dir.js';
import { WebpackBundler } from '@internals/bundlers/webpack';

const bundlers: Record<BundlerName, typeof Bundler> = {
  esbuild: EsbuildBundler,
  webpack: WebpackBundler,
  node: NodeBundler,
  umd: UMDBundler,
};

export default (program: Command) => program.command('serve-bundle')
  .description('Run a bundling command')
  .argument('<string>', 'bundler')
  .option('--use-tunnel', 'Whether to use a tunnel or not, which exposes the server to the web', true)
  .option('-p, --port <number>', 'port to run the test server on', (value) => {
    if (value === undefined) {
      return undefined;
    }
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
      throw new InvalidArgumentError(`Port was not a valid integer: ${value}`);
    }
    return parsedValue;
  })
  .action(async (bundlerName, { port, useTunnel }) => {
    if (!isValidBundlerName(bundlerName)) {
      throw new Error(`Invalid bundler provided: ${bundlerName}`)
    }
    if (bundlerName === 'node') {
      throw new Error('Serving node bundles is not supported');
    }
    const Bundler = bundlers[bundlerName];
    const bundler = new Bundler(getBundlerOutputDir(Bundler));
    const server = new HttpServer({ port, dist: bundler.absoluteDistFolder, useTunnel });
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
  });

