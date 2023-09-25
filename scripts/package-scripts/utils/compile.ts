import path from 'path';
// import ts, { ProjectReference } from 'typescript';
// import callExec from '../../../test/lib/utils/callExec';
import { OutputFormat } from '../prompt/types';
import { exec, ExecOptions } from 'child_process';

export type StdOut = (chunk: string) => void;
export type StdErr = (chunk: string) => void;

export const callExec = (cmd: string, {
  verbose = false,
  ...options
}: {
  encoding?: 'buffer' | null;
  verbose?: boolean;
} & ExecOptions = {}, stdout?: StdOut | boolean, stderr?: StdErr | boolean): Promise<void> => new Promise((resolve, reject) => {
  if (verbose) {
    console.log(`Running command: ${cmd}`);
  }
  const spawnedProcess = exec(cmd, options, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  if (stderr === true || verbose) {
    spawnedProcess.stderr?.pipe(process.stderr);
  } else if (!!stderr && typeof stderr !== 'boolean') {
    spawnedProcess.stderr?.on('data', stderr);
  }

  if (stdout === undefined || stdout === true) {
    spawnedProcess.stdout?.pipe(process.stdout);
  } else if (!!stdout) {
    spawnedProcess.stdout?.on('data', stdout);
  }
});

export default callExec;


// export function _old_compile(rootNames: string[], options: ts.CompilerOptions, projectReferences?: Array<ProjectReference>) {
//   let program = ts.createProgram({
//     rootNames, 
//     options,
//     projectReferences,
//   });
//   let emitResult = program.emit();

//   let allDiagnostics = ts
//     .getPreEmitDiagnostics(program)
//     .concat(emitResult.diagnostics);

//   allDiagnostics.forEach(diagnostic => {
//     if (diagnostic.file) {
//       let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
//       let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
//       console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
//     } else {
//       console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
//     }
//   });

//   return emitResult;
// };

type CompileTypescriptOpts = {
  outDir?: string;
  verbose?: boolean;
}
type CompileTypescript = (modelFolder: string, outputFormat: OutputFormat, opts?: CompileTypescriptOpts) => Promise<void>;

export const compileTypescript: CompileTypescript = (modelFolder: string, outputFormat: OutputFormat, {
  outDir,
  verbose,
} = {}) => callExec([
  `tsc`,
  `-p`,
  path.resolve(modelFolder, `tsconfig.${outputFormat}.json`),
  outDir ? `--outDir ${outDir}` : undefined,
].filter(Boolean).join(' '), {
  verbose,
  cwd: modelFolder,
});
