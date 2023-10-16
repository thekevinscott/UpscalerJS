import { output, } from '@internals/common/logger';
import { Bundler, BundlerName, isValidBundlerName, } from '@internals/bundlers';
import { HttpServer, } from '@internals/http-server';
import { EsbuildBundler, } from '@internals/bundlers/esbuild';
import { UMDBundler, } from '@internals/bundlers/umd';
import { NodeBundler, } from '@internals/bundlers/node';
import { WebpackBundler, } from '@internals/bundlers/webpack';
import { getBundlerOutputDir, } from '../utils/get-bundler-output-dir.js';
import { parseArgs } from "node:util";

const bundlers: Record<BundlerName, typeof Bundler> = {
  esbuild: EsbuildBundler,
  webpack: WebpackBundler,
  node: NodeBundler,
  umd: UMDBundler,
};

interface ServeBundleOptions {
  port?: number;
  useTunnel?: boolean;
}

export const serveBundle = async (bundlerName: BundlerName, {
  port,
  useTunnel = false,
}: ServeBundleOptions = {}): Promise<void> => {
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
};

const main = async () => {
  const {
    values,
    positionals: [
      bundlerName,
    ]
  } = parseArgs({
    options: {
      port: {
        type: "string",
        short: "p",
      },
      ['use-tunnel']: {
        type: "boolean",
        short: "t",
      },
    },
    allowPositionals: true,
  });

  if (!isValidBundlerName(bundlerName)) {
    throw new Error(`Invalid bundler provided: ${bundlerName}`)
  }
  if (bundlerName === 'node') {
    throw new Error('Serving node bundles is not supported');
  }
  const port = values.port ? parseInt(values.port) : undefined;
  await serveBundle(bundlerName, {
    port,
    useTunnel: values['use-tunnel'],
  });

};

main();
