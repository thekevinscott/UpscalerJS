import path from 'path';
import { mkdirp, writeFile } from '@internals/common/fs';
import { getContentForMethod } from './get-content-for-method.js';
import { Definitions } from '../types.js';
import { DeclarationReflection } from 'typedoc';

export const writeAPIDocumentationFiles = async (dest: string, methods: DeclarationReflection[], definitions: Definitions) => {
  await Promise.all(methods.map(async (method, i) => {
    const content = await getContentForMethod(method, definitions, i);
    if (!content) {
      throw new Error(`No content for method ${method.name}`);
    }
    const target = path.resolve(dest, `${method.name}.md`);
    await mkdirp(path.dirname(target));
    await writeFile(target, content.trim());
  }));
};

