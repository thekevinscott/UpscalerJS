import { getDefinitions } from './get-definitions/index.js';
import { getSortedMethodsForWriting } from './get-sorted-methods-for-writing.js';
import { writeIndexFile } from './write-index-file.js';
import { writeAPIDocumentationFiles } from './write-api-documentation-files/index.js';

export async function writeAPIDocs(dest: string) {
  return;
  const definitions = await getDefinitions();
  const methods = getSortedMethodsForWriting(definitions);

  await Promise.all([
    writeAPIDocumentationFiles(dest, methods, definitions),
    writeIndexFile(dest, methods),
  ]);
}
