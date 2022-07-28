import path from 'path';
// import ts, { ProjectReference } from 'typescript';
import callExec from '../../../test/lib/utils/callExec';
import { OutputFormat } from '../prompt/types';

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
}
type CompileTypescript = (modelFolder: string, outputFormat: OutputFormat, opts?: CompileTypescriptOpts) => Promise<void>;

export const compileTypescript: CompileTypescript = (modelFolder: string, outputFormat: OutputFormat, {
  outDir,
} = {}) => callExec([
  `tsc`,
  `-p`,
  path.resolve(modelFolder, `tsconfig.${outputFormat}.json`),
  outDir ? `--outDir ${outDir}` : undefined,
].filter(Boolean).join(' '), {
  cwd: modelFolder,
});
