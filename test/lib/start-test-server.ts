import yargs from 'yargs';
import inquirer from 'inquirer';
import { bundle as esbuildBundle, DIST as ESBUILD_DIST } from './esm-esbuild/prepare';
import { startServer } from './shared/server';
import { bundleWebpack as webpackBundle, DIST as WEBPACK_DIST } from './esm-webpack/prepare';
import { DIST as UMD_DIST, prepareScriptBundleForUMD } from './umd/prepare';

interface Args {
  type: TestServerType;
  port: number;
}

const getType = async (type?: string): Promise<TestServerType> => {
  if (isValidType(type)) {
    return type;
  }
  const r = await inquirer.prompt<Answers>([
    {
      type: 'list',
      name: 'type',
      message: 'Which type of server do you want to start?',
      choices: AVAILABLE_SERVER_TYPES,
    },
  ]);
  return r.type;
}

const getArgs = async (): Promise<Args> => {
  const argv = await yargs(process.argv.slice(2)).options({
    type: { type: 'string'},
    port: { type: 'number', default: 8099 },
  }).argv;

  const type = await getType(argv.type);

  return {
    type,
    port: argv.port,
  }
}

const AVAILABLE_SERVER_TYPES = ['esbuild', 'webpack', 'umd'];
type TestServerType = 'esbuild' | 'webpack' | 'umd';
type StartTestServer = (type: TestServerType, port: number) => Promise<void>;
type Answers = { type: TestServerType, port: number };

const isValidType = (type: string = ''): type is TestServerType => AVAILABLE_SERVER_TYPES.includes(type);






const startTestServer: StartTestServer = async (type, port = 8099) => {
  let dist;
  if (type === 'esbuild') {
    await esbuildBundle();
    dist = ESBUILD_DIST;
    await startServer(port, dist);
  } else if (type === 'webpack') {
    dist = WEBPACK_DIST;
    await webpackBundle();
    await startServer(port, dist);
  } else if (type === 'umd') {
    dist = UMD_DIST;
    await prepareScriptBundleForUMD();
    await startServer(port, dist);
  } else {
    throw new Error(`Unsupported type provided to test server: ${type}`)
  }
  console.log([
    `http://localhost:${port}`,
    `- type: ${type}`,
    `- folder: ${dist}`,
  ].join('\n'));
};

export default startTestServer;

if (require.main === module) {
  (async () => {
    const { type, port } = await getArgs();

    await startTestServer(type, port);
  })();
}
