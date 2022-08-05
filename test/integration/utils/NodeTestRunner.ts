import { timeit } from "./timeit";
import { GetScriptContents, testNodeScript } from "../../lib/node/prepare";

type Bundle = () => Promise<void>;

export type Dependencies = Record<string, string>;
export type DefinedDependencies = Record<string, any>;
export type Main = (dependencies: DefinedDependencies) => Promise<void>;
export type Globals = Record<string, any>;

interface TestOpts {
  dependencies?: Dependencies;
  main?: Main;
  globals?: Globals;
}

const makeDependency = ([name, dependency]: [string, string]) => `const ${name} = require('${dependency}');`;
const makeGlobal = ([name, value]: [string, string]) => `const ${name} = ${value};`;

const DEFAULT_DEPENDENCIES = {
  fs: 'fs',
  path: 'path',
};

export class NodeTestRunner {
  trackTime: boolean;
  dependencies: Dependencies;
  main?: Main;
  globals: Globals;

  constructor({
    trackTime = false,
    dependencies = {},
    main,
    globals = {},
  }: {
    trackTime?: boolean;
    main?: Main,
    dependencies?: Dependencies;
    globals?: Globals;
  } = {}) {
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

  async test({
    dependencies = {},
    main,
    globals = {},
  }: TestOpts) {
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
    try {
      return await testNodeScript(contents, {
        removeTmpDir: true, // set to false if you need to inspect the Node output files
        testName: expect.getState().currentTestName,
      });
    } catch(err: any) {
      const message = err.message;
      const pertinentLine = message.split('Error: ').pop().split('\n')[0].trim();
      throw new Error(pertinentLine);
    }
  }

  /****
   * Jest lifecycle methods
   */

  @timeit<[Bundle], NodeTestRunner>('beforeAll scaffolding')
  async beforeAll(bundle: Bundle) {
    await bundle();
  }
}

const getScriptContents = (
  dependencies: Dependencies, 
  main: Main, 
  globals: Globals
): GetScriptContents => (outputFile: string) => `
const { __awaiter } = require("tslib");

${Object.entries(dependencies).map(makeDependency).join('\n')}
${Object.entries(globals).map(makeGlobal).join('\n')}
(async () => {
  const data = await ${main.toString()}({
    ${Object.keys({
      ...dependencies,
      ...globals,
    }).map((key) => `${key},`).join('\n')}
  });
  fs.writeFileSync('${outputFile}', data);
})();
`;
