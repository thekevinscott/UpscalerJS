import path from 'path';
import { mkdirp, writeFile } from '@internals/common/fs';
import { getContentForMethod } from './get-content-for-method.js';
import { Definitions } from '../types.js';
import { DeclarationReflection } from 'typedoc';
import { info, verbose } from '@internals/common/logger';

export const writeAPIDocumentationFiles = async (dest: string, methods: DeclarationReflection[], definitions: Definitions) => {
  await Promise.all(methods.map(async (method, i) => {
    verbose('Getting content for method', method.name);
    const content = await getContentForMethod(method, definitions, i);
    verbose('Content for method', method.name, 'measures', content.length);
    if (!content) {
      throw new Error(`No content for method ${method.name}`);
    }
    const target = path.resolve(dest, `${method.name}.md`);
    await mkdirp(path.dirname(target));
    await writeFile(target, content.trim());
    verbose('Wrote content for method', method.name, 'to', target);
  }));
};

