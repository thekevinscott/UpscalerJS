import { timeit } from "./timeit";
import path from 'path';
import { GetScriptContents, NODE_ROOT, runNodeScript } from "../../lib/node/prepare";
import { Opts } from '../../lib/shared/prepare';
import { withTmpDir } from "../../../scripts/package-scripts/utils/withTmpDir";

export type Bundle<T = {}> = (opts?: T & {
  verbose?: boolean;
  skipInstallNodeModules?: boolean;
  skipInstallLocalPackages?: boolean;
  skipCopyFixtures?: boolean;
 }) => Promise<void>;

export type Dependencies = Record<string, string>;
export type DefinedDependencies = Record<string, any>; // skipcq: js-0323
export type Main<T extends DefinedDependencies = DefinedDependencies> = (dependencies: T) => Promise<string>;
export type Globals = Record<string, any>; // skipcq: js-0323

interface TestOpts<T extends DefinedDependencies> {
  dependencies?: Dependencies;
  main?: Main<T>;
  globals?: Globals;
}

const makeDependency = ([name, dependency]: [string, string]) => `const ${name} = require('${dependency}');`;
const makeGlobal = ([name, value]: [string, string]) => `const ${name} = ${value};`;

const DEFAULT_DEPENDENCIES = {
  fs: 'fs',
  path: 'path',
};

export class NodeTestRunner<T extends DefinedDependencies> {
  trackTime: boolean;
  dependencies: Dependencies;
  main?: Main<T>;
  globals: Globals;
  verbose?: boolean;

  constructor({
    trackTime = false,
    dependencies = {},
    main,
    globals = {},
    verbose,
  }: {
    trackTime?: boolean;
    main?: Main<T>,
    dependencies?: Dependencies;
    globals?: Globals;
    verbose?: boolean;
  } = {}) {
    this.verbose = verbose !== undefined ? verbose : process.env.verbose === 'true';
    if (this.verbose) {
      console.log('Running NodeTestRunner in verbose mode.');
    }
    this.trackTime = trackTime;
    this.dependencies = {
      ...DEFAULT_DEPENDENCIES,
      ...dependencies,
    };
    this.globals = {
      ...globals,
    }
    this.main = main;
  }

  /****
   * Utility methods
   */

  async run({
    dependencies = {},
    main,
    globals = {},
  }: TestOpts<T>, {
    removeTmpDir = true, // set to false if you need to inspect the Node output files
    } = {}): Promise<Buffer | undefined> {
    const _main = main || this.main;
    if (!_main) {
      throw new Error('No main function defined');
    }

    const contents = getScriptContents({
      ...this.dependencies,
      ...dependencies,
    }, _main, {
      ...this.globals,
      ...globals,
    });
    let testName = '';
    try {
      testName = expect.getState().currentTestName || '';
    } catch (err) { }
    try {
      let output: Buffer | undefined;
      const tmpRoot = path.resolve(NODE_ROOT, './tmp');
      await withTmpDir(async tmpDir => {
        output = await runNodeScript(contents, {
          removeTmpDir,
          testName,
          rootDir: path.resolve(tmpRoot, tmpDir),
          verbose: this.verbose,
        });
      }, {
        rootDir: tmpRoot,
        removeTmpDir,
      });
      return output;
    } catch (err: unknown) {
      if (err instanceof Error) {
        const message = err.message;
        if (typeof message === 'string' && message !== '') {
          const errorMessage = message.split('Error: ').pop();
          if (errorMessage) {
            const pertinentLine = errorMessage.split('\n')[0].trim();
            throw new Error(pertinentLine);
          }
        }
      }
      throw err;
    }
  }

  private _makeOpts(): Opts {
    return {
      verbose: this.verbose,
    }
  }

  /****
   * Jest lifecycle methods
   */

  @timeit<[Bundle], NodeTestRunner<T>>('beforeAll scaffolding')
  async beforeAll(bundle: Bundle) {
    if (bundle) {
      const opts = this._makeOpts();
      await bundle(opts);
    }
  }
}

function getScriptContents<T extends DefinedDependencies>(
  dependencies: Dependencies, 
  main: Main<T>, 
  globals: Globals
): GetScriptContents {
  return (outputFile: string) => `
const { __awaiter } = require("tslib");

${Object.entries(dependencies).map(makeDependency).join('\n')}
${Object.entries(globals).map(makeGlobal).join('\n')}
(async () => {
  const main = ${main.toString()};
  const data = await main({ ${Object.keys({
    ...dependencies,
    ...globals,
  }).join(', ')} });
  fs.writeFileSync('${outputFile}', data);
})();
`;
}
