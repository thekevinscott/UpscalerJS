import path from 'path';
// import ts, { ProjectReference } from 'typescript';
import callExec from '../../../test/lib/utils/callExec';
import { OutputFormat } from './types';

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

export const compileTypescript = (modelFolder: string, outputFormat: OutputFormat) => callExec([
  `tsc`,
  `-p`,
  path.resolve(modelFolder, `tsconfig.${outputFormat}.json`),
].join(' '), {
  cwd: modelFolder,
});
