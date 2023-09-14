import { timeit } from "./utils/timeit.js";
import { exec, ExecOptions } from 'child_process';
import path from 'path';
import { withTmpDir } from "@internals/common/tmp-dir";
import { getHashedName } from "@internals/common/get-hashed-name";
import { info } from "@internals/common/logger";
import { exists } from "@internals/common/fs";
import fsExtra from "fs-extra";
import { getTemplate } from "@internals/common/get-template";
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../_templates');

type Bundle = () => Promise<void>;

const { readFile } = fsExtra;

type StdOut = (chunk: string) => void;

export const callExec = (cmd: string, options: ExecOptions, stdout: StdOut): Promise<void> => new Promise((resolve, reject) => {
  const spawnedProcess = exec(cmd, options, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  spawnedProcess.stderr?.pipe(process.stderr);
  spawnedProcess.stdout?.on('data', stdout);
});

const getPertinentLine = (error: Error) => {
  const message = error.message;
  const pertinentPart = message.split('Error: ').pop();
  if (!pertinentPart) {
    return 'error message does not contain "Error: " string';
  }
  return pertinentPart.split('\n')[0].trim();
};

export class RunNodeScriptError extends Error {
  name = 'RunNodeScriptError';
  pertinentLine: string;

  constructor(error: unknown, _script?: string) {
    if (error instanceof Error) {
      const pertinentLine = getPertinentLine(error);
      const message = pertinentLine;
      // const message = `${script}\n${pertinentLine}`;
      super(message);
      this.pertinentLine = pertinentLine;
      Error.captureStackTrace(this, this.constructor);
      // this.message = `${script}\n${this.message}`;
    } else {
      throw new Error('error not an instance of Error within RunNodeScriptError')
    }
  }
}

type ContentFn = (outputDir: string) => Promise<string>;
const runNodeScript = (contentFn: ContentFn, cwd: string): Promise<Buffer> => withTmpDir(async (tmpDir) => {
  const dataFile = path.join(tmpDir, getHashedName());
  const contents = await contentFn(dataFile);
  
  await callExec(`node -e "${contents.replace(/"/g, '\\"')}"`, {
    cwd,
    env: {
      // Hide warnings about TFJS not being compiled to use AXA on the CPU 
      TF_CPP_MIN_LOG_LEVEL: '3',
    },
  }, chunk => {
    info('[PAGE]', chunk);
  });
  if (!await exists(dataFile)) {
    throw new Error(`Data file ${dataFile} was not created. Double check that your Node script writes its output to the given data file.`);
  }
  return readFile(dataFile);
});

export class ServersideTestRunner {
  trackTime: boolean;
  verbose?: boolean;
  cwd: string;

  constructor({
    trackTime = false,
    cwd,
  }: {
    cwd: string;
    trackTime?: boolean;
  }) {
    this.cwd = cwd;
    this.trackTime = trackTime;
  }

  /****
   * Utility methods
   */

  async run(script: string): Promise<Buffer> {
    const contentFn = (outputFile: string) => {
      return getTemplate(path.resolve(TEMPLATES_DIR, 'node-script.js.ejs'), {
        outputFile,
        script,
      });
    };
    return runNodeScript(contentFn, this.cwd).catch((err: unknown) => {
      throw new RunNodeScriptError(err, script);
    });
  }

  /****
   * Test lifecycle methods
   */

  @timeit<[Bundle], ServersideTestRunner>('beforeAll scaffolding')
  async beforeAll(bundle: Bundle) { // skipcq: JS-0105
    if (bundle) {
      await bundle();
    }
  }
}
