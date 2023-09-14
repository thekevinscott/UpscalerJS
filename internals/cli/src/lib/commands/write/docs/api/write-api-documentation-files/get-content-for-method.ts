import { TYPES_TO_EXPAND } from './constants.js';
import { DeclarationReflection, SignatureReflection, TypeParameterReflection } from 'typedoc';
import { Definitions } from './types.js';
import { getSource } from './get-source.js';
import { getTextSummary } from './get-text-summary.js';
import { getParameters } from './write-parameter.js';
import { getReturnType } from './get-return-type.js';
import { EXPANDED_TYPE_CONTENT } from '../constants.js';

function getAsObj <T>(arr: T[], getKey: (item: T) => string) {
  return arr.reduce((obj, item) => ({
    ...obj,
    [getKey(item)]: item,
  }), {} as Record<string, T>);
}

const writeExpandedTypeDefinitions = (methodName: string, definitions: Definitions, typeParameters: Record<string, TypeParameterReflection> = {}): string => {
  // this method is for writing out additional information on the types, below the parameters
  const typesToExpand: string[] = TYPES_TO_EXPAND[methodName === 'constructor' ? '_constructor' : methodName] || [];
  return typesToExpand.map(type => [
    `### \`${type}\``,
    EXPANDED_TYPE_CONTENT[type](definitions, typeParameters),
  ].join('\n')).join('\n');
}

export const getContentForMethod = async (method: DeclarationReflection, definitions: Definitions, i: number) => {
  const {
    name,
    signatures,
    sources,
  } = method;

  if (name === 'upscale') {
    return [
      [
        '---',
        `title: ${name}`,
        `sidebar_position: ${i}`,
        `sidebar_label: ${name}`,
        '---',
      ].join('\n'),

      `# ${name}`,
      'Alias for [`execute`](execute)',
    ].filter(Boolean).join('\n\n');

  }

  if (!sources?.length) {
    throw new Error(`No sources found for ${name}`);
  }
  if (!signatures?.length) {
    const { type: _type, ...m } = method;
    throw new Error(`No signatures found in ${name}`);
  }
  const signature = signatures[0] as SignatureReflection & { typeParameter?: TypeParameterReflection[] };
  const { comment, parameters, typeParameter: typeParameters } = signature;

  const { description, codeSnippet, blockTags } = getTextSummary(name, comment);
  let source;
  try {
    source = await getSource(sources);
  } catch(e) {
    throw e;
  }

  const content = [
    [
      '---',
      `title: ${name}`,
      `sidebar_position: ${i}`,
      `sidebar_label: ${name}`,
      '---',
    ].join('\n'),
`# \`${name}\``,
    description,
    ...(codeSnippet ? [
      `## Example`,
      codeSnippet,
    ] : []),
    source,
    ...(parameters ? [
      '## Parameters',
      getParameters(name, parameters, definitions, getAsObj<TypeParameterReflection>(typeParameters || [], t => t.name)),
    ] : []),
    writeExpandedTypeDefinitions(name, definitions, getAsObj<TypeParameterReflection>(typeParameters || [], t => t.name)),
    '## Returns',
    getReturnType(signatures, blockTags),
  ].filter(Boolean).join('\n\n');
  return content;
};
