import { mkdirp, writeFile } from 'fs-extra';
import path from 'path';
import { Application, ArrayType, Comment, CommentTag, DeclarationReflection, IntersectionType, IntrinsicType, LiteralType, ParameterReflection, ProjectReflection, ReferenceType, ReflectionKind, SignatureReflection, SomeType, SourceReference, TSConfigReader, TypeDocOptions, TypeDocReader, TypeParameterReflection, UnionType } from 'typedoc';
import { scaffoldDependenciesForUpscaler } from '../build-upscaler';
import { Platform } from '../prompt/types';
import { CORE_DIR, DOCS_DIR, UPSCALER_DIR } from '../utils/constants';

/****
 * Types
 */
type DecRef = DeclarationReflection | PlatformSpecificDeclarationReflection;
interface Definitions {
  constructors: Record<string, DecRef>;
  methods: Record<string, DecRef>;
  interfaces: Record<string, DecRef>;
  types: Record<string, DecRef>;
  classes: Record<string, DecRef>;
  functions: Record<string, DecRef>;
}

interface ExpandedProjectReflection extends Omit<ProjectReflection, 'children'> {
  children?: (DeclarationReflection | PlatformSpecificDeclarationReflection)[];
}

interface PlatformSpecificDeclarationReflection {
  name: string;
  kindString: 'Platform Specific Type';
  node: DeclarationReflection;
  browser: DeclarationReflection;
  type: DeclarationReflection['type'];
  children: [];
}

/****
 * Constants
 */
const REPO_ROOT = 'https://github.com/thekevinscott/UpscalerJS';
const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/api');
const VALID_EXPORTS_FOR_WRITING_DOCS = ['default'];
const VALID_METHODS_FOR_WRITING_DOCS = [
  'constructor', 
  'upscale',
  'warmup',
  'abort',
  'dispose',
  'getModel',
];
const INTRINSIC_TYPES = [
  'string',
  'number',
  'boolean',
];
// define special type information that is external
const makeNewExternalType = (name: string, url: string) => {
  const type = new DeclarationReflection(name, ReflectionKind['SomeType']);
  const source = new SourceReference('', 0, 0);
  source.url = url;
  type.sources = [source];
  return type;
};

const EXTERNALLY_DEFINED_TYPES: Record<string, DeclarationReflection> = {
  'AbortSignal': makeNewExternalType(
    'AbortSignal',
    'https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal'
  ),
  'SerializableConstructor': makeNewExternalType(
    'SerializableConstructor',
    'https://github.com/tensorflow/tfjs/blob/38f8462fe642011ff1b7bcbb52e018f3451be58b/tfjs-core/src/serialization.ts#L54',
  ),
}

/****
 * Utility functions
 */
const getUpscalerAsTree = async (): Promise<ExpandedProjectReflection> => {
  await scaffoldDependenciesForUpscaler('node');
  const upscalerTree: ExpandedProjectReflection = getPackageAsTree([path.resolve(UPSCALER_DIR, 'src')], path.resolve(UPSCALER_DIR, 'tsconfig.esm.json'));
  const coreTree = getPackageAsTree([path.resolve(CORE_DIR, 'src')], path.resolve(CORE_DIR, 'tsconfig.json'));
  const platformSpecificTypes = await getTypesFromPlatformSpecificFiles();
  upscalerTree.children = [
    upscalerTree,
    coreTree,
    platformSpecificTypes,
  ].reduce((arr, tree) => arr.concat(tree.children || []), [] as (DeclarationReflection | PlatformSpecificDeclarationReflection)[]);
  return upscalerTree;
}

const getPackageAsTree = (entryPoints: string[], tsconfig: string): ProjectReflection => {
  const app = new Application();

  app.options.addReader(new TSConfigReader());
  app.options.addReader(new TypeDocReader());

  app.bootstrap({
    entryPoints,
    tsconfig,
  });

  const project = app.convert();

  if (project) {
    return app.serializer.projectToObject(project) as ProjectReflection;
  } else {
    throw new Error('No project was converted.')
  }
}

const getTypeFromPlatformSpecificFiles = async (fileName: string, typeName: string) => {
  const platforms: Platform[] = ['browser', 'node'];
  const platformSpecificTypes: DeclarationReflection[] = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    await scaffoldDependenciesForUpscaler(platform);
    const imageBrowser = getPackageAsTree([path.resolve(UPSCALER_DIR, 'src', `${fileName}.${platform}.ts`)], path.resolve(UPSCALER_DIR, `tsconfig.docs.${platform}.json`));
    const matchingType = imageBrowser.children?.filter(child => child.name === typeName).pop();
    if (!matchingType) {
      throw new Error(`Could not find input from ${fileName}.${platform}.ts`);
    }
    platformSpecificTypes.push(matchingType);
  }

  const platformSpecificType: PlatformSpecificDeclarationReflection = {
    name: 'Input',
    kindString: 'Platform Specific Type',
    browser: platformSpecificTypes[0],
    node: platformSpecificTypes[1],
    children: [],
    type: platformSpecificTypes[0].type,
  }

  return platformSpecificType;
}

const getTypesFromPlatformSpecificFiles = async (): Promise<{
  children: PlatformSpecificDeclarationReflection[];
}> => {
  return {
    children: await Promise.all([
      getTypeFromPlatformSpecificFiles('image', 'Input'),
    ]),
  };
}

function getAsObj <T>(arr: T[], getKey: (item: T) => string) {
  return arr.reduce((obj, item) => ({
    ...obj,
    [getKey(item)]: item,
  }), {} as Record<string, T>);
}

const getKindStringKey = (kindString: string = '') => {
  switch (kindString) {
    case 'Platform Specific Type':
      return 'types';
    case 'Constructor':
      return 'constructors';
    case 'Method':
      return 'methods';
    case 'Interface':
      return 'interfaces';
    case 'Type alias':
      return 'types';
    case 'Class':
      return 'classes';
    case 'Function':
      return 'functions';
    default:
      throw new Error(`Unexpected kind string: ${kindString}`);
  }
}

const getChildren = (projectReflection: ExpandedProjectReflection): Definitions => {
  const children = projectReflection.children;
  if (children === undefined) {
    throw new Error('No children found in project reflection');
  }

  const parsedChildren = children.reduce((obj, child) => {
    const { kindString } = child;
    const key = getKindStringKey(kindString);
    if (!key) {
      throw new Error(`Unexpected kind string: ${kindString}`);
    }
    return {
      ...obj,
      [key]: obj[key].concat(child),
    };
  }, {
    constructors: [] as DecRef[],
    methods: [] as DecRef[],
    functions: [] as DecRef[],
    interfaces: [] as DecRef[],
    types: [] as DecRef[],
    classes: [] as DecRef[],
  });

  return {
    methods: getAsObj<DecRef>(parsedChildren.methods, i => i.name),
    constructors: getAsObj<DecRef>(parsedChildren.constructors, i => i.name),
    functions: getAsObj<DecRef>(parsedChildren.functions, i => i.name),
    types: getAsObj<DecRef>(parsedChildren.types, i => i.name),
    interfaces: getAsObj<DecRef>(parsedChildren.interfaces, i => i.name),
    classes: getAsObj<DecRef>(parsedChildren.classes, i => i.name),
  };
};

const getSummary = (comment?: Comment) => {
  return comment?.summary.map(({ text }) => text).join('');
}

const getTextSummary = (comment?: Comment) => {
  if (comment === undefined) {
    return {};
  }
  const { summary, blockTags } = comment;
  const { text, code } = summary.reduce((obj, item) => {
    return {
      ...obj,
      [item.kind]: item.text.trim(),
    }
  }, {
    text: '',
    code: '',
  });
  return {
    blockTags: blockTags?.reduce((obj, blockTag) => {
      return {
        ...obj,
        [blockTag.tag]: blockTag.content,
      };
    }, {}),
    description: text.trim(),
    code,
  }
};

const getSource = ([source]: SourceReference[]) => {
  let {
    fileName,
    line,
    // character, 
    url,
  } = source;
  url = `${REPO_ROOT}/blob/main/${fileName}#L${line}`;
  // if (!url) {
  //   throw new Error(`No URL defined for source ${fileName} at line ${line}`);
  // }
  const prettyFileName = fileName.split('packages/upscalerjs/src/').pop();
  return `<small className="gray">Defined in <a target="_blank" href="${rewriteURL(url)}">${prettyFileName}:${line}</a></small>`;
};

const rewriteURL = (url: string) => {
  const parts = url.split(/blob\/(?<group>[^/]+)/)
  if (parts.length !== 3) {
    throw new Error(`Error with the regex: ${url}`);
  }
  return [
    parts[0],
    'tree/main',
    parts[2],
  ].join('');
}

const isDeclarationReflection = (reflection?: DecRef): reflection is DeclarationReflection => {
  return reflection?.kindString !== 'Platform Specific Type';
}
const isArrayType = (type: SomeType): type is ArrayType => type.type === 'array';
const isReferenceType = (type: SomeType): type is ReferenceType => type.type === 'reference';
const isLiteralType = (type: SomeType): type is LiteralType => type.type === 'literal';
const isInstrinsicType = (type: SomeType): type is IntrinsicType => type.type === 'intrinsic';
const isUnionType = (type: SomeType): type is UnionType => type.type === 'union';
const isIntersectionType = (type: SomeType): type is IntersectionType => type.type === 'intersection';

const getLiteralTypeValue = (type: LiteralType): string => {
  const { value } = type;
  if (typeof value === 'number') {
    return `${value}`;
  } else if (typeof value === 'string') {
    return value;
  }

  throw new Error('Not yet implemented for literal');
}

const getReferenceTypeOfParameter = (_type?: SomeType, definitions?: Definitions): {
  type: 'reference' | 'array' | 'literal' | 'intrinsic' | 'union',
  name: string;
  includeURL?: boolean;
} => {
  if (!_type) {
    throw new Error('Define a type');
  }
  if (isArrayType(_type)) {
    const { elementType } = _type;
    if (isReferenceType(elementType)) {
      return {
        type: _type.type,
        name: elementType.name,
      }
    } else if (isUnionType(elementType)) {
      return {
        type: 'union',
        name: elementType.types.map(t => {
          if ('name' in t) {
            return t.name;
          }
          throw new Error('unimplemented');
        }).join(' | '),
      }
    }

    console.error(_type);

    throw new Error('Not yet implemented');
  }

  if (isReferenceType(_type)) {
    const { name } = _type;
    if (name === 'ModelDefinitionObjectOrFn') {
      return {
        type: _type.type,
        name: "ModelDefinition",
      };
    }
    return {
      type: _type.type,
      name,
    };
  }

  if (isLiteralType(_type)) {
    return {
      type: 'literal',
      name: getLiteralTypeValue(_type),
    };
  }

  if (isInstrinsicType(_type)) {
    return {
      type: 'intrinsic',
      name: _type.name,
    }
  }

  if (isIntersectionType(_type)) {
    const refType = _type.types.filter(t => t.type === 'reference').pop();
    if (!refType || !isReferenceType(refType)) {
      throw new Error('No reference type found on intersection type.');
    }
    // if (definitions === undefined) {
    //   throw new Error('Intersection type was provided and a reference type was found in the union, but no definitions are present.')
    // }
    const t = refType.typeArguments?.filter(t => t.type === 'reference').pop();
    if (!t || !('name' in t)) {
      throw new Error('No type arguments found on intersection type.');
    }
    return {
      type: 'literal',
      name: t.name,
    };
  }

  if (isUnionType(_type)) {
    let includeURL = true;

    const getNameFromUnionType = (type: UnionType): string => type.types.map(t => {
      if (isReferenceType(t)) {
        if (definitions === undefined) {
          console.warn('Union type was provided and a reference type was found in the union, but no definitions are present.');
          return t.name;
        }
        const { interfaces, types } = definitions;
        const matchingType = interfaces[t.name] || types[t.name];
        if (!isDeclarationReflection(matchingType)) {
          throw new Error('Is a platform specific type');
        }
        if (!matchingType?.type) {
          return t.name;
          // throw new Error(`No matching type found for literal ${t.name} in union`);
        }
        const matchingTypeType = matchingType.type;
        if (isLiteralType(matchingTypeType)) {
          // if any literal types are included, don't include the URL
          includeURL = false;
          return JSON.stringify(matchingTypeType.value);
        }
        if (matchingTypeType.type === 'reflection') {
          // Ignore reflection types
          return t.name;
        }
        if (matchingTypeType.type === 'union') {
          return getNameFromUnionType(matchingTypeType);
        }
        if (matchingTypeType.type === 'tuple') {
          console.log('matchingTypeType tuple', matchingTypeType);
          return `[${matchingTypeType.elements.map(e => {
            if ('name' in e) {
              return e.name;
            }
            throw new Error('Array type not yet implemented');
          }).join(',')}]`;
        }
        console.error('matchingTypeType', JSON.stringify(matchingTypeType, null, 2));

        throw new Error(`Unsupported type of matching type ${matchingTypeType.type} in reference type of union type ${t.name}.`);
      } else if (isInstrinsicType(t)) {
        if (t.name === 'undefined') {
          // ignore an explicit undefined type; this should be better represented to the user as an optional flag.
          return undefined;
        }
        return t.name;
      } else if (isLiteralType(t)) {
        return `${t.value}`;
      } else if (t.type === 'indexedAccess') {
        const objectType = t.objectType;
        if ('name' in objectType) {
          return objectType.name;
        }
        return '';
      } else if (t.type === 'array') {
        if ('name' in t.elementType) {
          return `${t.elementType.name}[]`;
        }
        console.warn('Unknown element type', t);
        // throw new Error('Unknown element type');
        return '';
      }
      console.error(t);
      throw new Error(`Unsupported type in union type: ${t.type}`);
    }).filter(Boolean).join(' | ');

    const name = getNameFromUnionType(_type);

    return {
      type: 'literal',
      includeURL,
      name,
    };
  }

  console.error(_type)

  throw new Error(`Unsupported type: ${_type.type}`)
}

const getURLFromSources = (sources?: SourceReference[]) => {
  if (sources?.length) {
    const { url } = sources?.[0] || {};
    if (url?.startsWith(REPO_ROOT)) {
      return rewriteURL(url);
    }
    return url;
  }

  return undefined;
}

function sortChildrenByLineNumber<T extends (DeclarationReflection | ParameterReflection)>(children: (T)[]) {
  return children.sort(({ sources: aSrc }, { sources: bSrc }) => {
    if (!aSrc?.length) {
      return 1;
    }
    if (!bSrc?.length) {
      return -1;
    }
    return aSrc[0].line - bSrc[0].line;
  });
}

const isTypeParameterReflection = (reflection: DecRef | TypeParameterReflection): reflection is TypeParameterReflection => {
  return 'parent' in reflection;
}

const writeParameter = (parameter: ParameterReflection | DeclarationReflection, matchingType: undefined | DecRef | TypeParameterReflection, definitions: Definitions) => {
  if (matchingType !== undefined && !isTypeParameterReflection(matchingType) && !isDeclarationReflection(matchingType)) {
    const comment = getSummary(parameter.comment);
    const { type, name } = getReferenceTypeOfParameter(parameter.type, definitions);
    const parsedName = `\`${name}${type === 'array' ? '[]' : ''}\``;
    return [
      '-',
      `**${parameter.name}${parameter.flags?.isOptional ? '?' : ''}**:`,
      `[${parsedName}](#${name.toLowerCase()})`,
      comment ? ` - ${comment}` : undefined,
    ].filter(Boolean).join(' ');
  }
  const comment = getSummary(parameter.comment);
  const { type, name, includeURL = true } = getReferenceTypeOfParameter(parameter.type, definitions);
  const url = includeURL ? getURLFromSources(matchingType?.sources) : undefined;
  const parsedName = `${name}${type === 'array' ? '[]' : ''}`;
  const linkedName = url ?  `[\`${parsedName}\`](${url})` : `\`${parsedName}\``;
  return [
    '-',
    `**${parameter.name}${parameter.flags?.isOptional ? '?' : ''}**:`,
    `${linkedName}`,
    comment ? ` - ${comment}` : undefined,
  ].filter(Boolean).join(' ');
};

const writePlatformSpecificParameter = (platform: string, parameter: DeclarationReflection, definitions: Definitions) => {
  const comment = getSummary(parameter.comment);
  const { type, name } = getReferenceTypeOfParameter(parameter.type, definitions);
  const url = getURLFromSources(parameter.sources);
  const parsedName = `${name}${type === 'array' ? '[]' : ''}`;
  return [
    '-',
    `**[${platform}](${url})**:`,
    `\`${parsedName}\``,
    comment ? ` - ${comment}` : undefined,
  ].filter(Boolean).join(' ');

}

const writePlatformSpecificDefinitions = (definitions: Definitions, typeParameters: Record<string, TypeParameterReflection> = {}) => {
  const platformSpecificTypes: PlatformSpecificDeclarationReflection[] = [];
  for (let i = 0; i< Object.values(definitions.types).length; i++) {
    const type = Object.values(definitions.types)[i];
    if (!isDeclarationReflection(type)) {
      platformSpecificTypes.push(type);
    }
  }
  return platformSpecificTypes.map(parameter => {
    return [
      `### \`${parameter.name}\``,
      writePlatformSpecificParameter('Browser', parameter.browser, definitions),
      writePlatformSpecificParameter('Node', parameter.node, definitions),
    ].join('\n')
  });
}

const getMatchingType = (parameter: ParameterReflection | DeclarationReflection, definitions: Definitions, typeParameters: Record<string, TypeParameterReflection> = {}) => {
  const { classes, interfaces, types } = definitions;
  let { name: nameOfTypeDefinition } = getReferenceTypeOfParameter(parameter.type, definitions);
  let matchingType: undefined | PlatformSpecificDeclarationReflection | DeclarationReflection | TypeParameterReflection = undefined;
  if (!INTRINSIC_TYPES.includes(nameOfTypeDefinition) && parameter.type !== undefined && !isLiteralType(parameter.type)) {
    // first, check if it is a specially defined external type
    matchingType = EXTERNALLY_DEFINED_TYPES[nameOfTypeDefinition] || interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
    // console.log('matchingType', matchingType);
    if (!matchingType) {
      // it's possible that this type is a generic type; in which case, replace the generic with the actual type it's extending
      matchingType = typeParameters[nameOfTypeDefinition];
      if (matchingType) {
        nameOfTypeDefinition = (matchingType as any).type.name;
        matchingType = interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
        parameter.type = matchingType.type;
      }
    }
    if (!matchingType && (parameter.type === undefined || !isUnionType(parameter.type))) {
      console.warn('------')
      console.warn(parameter.type);
      console.warn([
        `No matching type could be found for ${nameOfTypeDefinition}.`,
        `- Available interfaces: ${Object.keys(interfaces).join(', ')}`,
        `- Available types: ${Object.keys(types).join(', ')}`,
        `- Available classes: ${Object.keys(classes).join(', ')}`
      ].join('\n'));
      console.warn('------')
    }
  }
  return matchingType;
}

const getParameters = (parameters: (ParameterReflection | DeclarationReflection)[], definitions: Definitions, typeParameters: Record<string, TypeParameterReflection> = {}, depth = 0): string => {
  if (depth > 5) {
    throw new Error('Too many levels of depth');
  }
  return parameters.map((parameter) => {
    const matchingType = getMatchingType(parameter, definitions, typeParameters);
    const { children = [] } = matchingType || {};
    return [
      writeParameter(parameter, matchingType, definitions),
      getParameters(sortChildrenByLineNumber(children), definitions, typeParameters, depth + 1),
    ].filter(Boolean).map(line => Array(depth * 2).fill(' ').join('') + line).join('\n');
  }).filter(Boolean).join('\n');
};

const getReturnType = (signatures: (SignatureReflection & { typeParameter?: TypeParameterReflection[] })[], blockTags?: Record<string, CommentTag['content']>) => {
  if (signatures.length === 1) {
    const { type } = signatures[0];
    if (type === undefined) {
      return 'void';
    }

    if (isReferenceType(type)) {
      const { name, typeArguments } = type;
      let nameOfType = name;
      if (typeArguments?.length) {
        nameOfType = `${nameOfType}<${typeArguments.map(t => getReferenceTypeOfParameter(t)).map(({ name }) => name).join(', ')}>`;
      }
      const returnDescription = blockTags?.['@returns']?.map(({ text }) => text).join('');
      return `\`${nameOfType}\`${returnDescription ? ` - ${returnDescription}` : ''}`;
    }

    if (isInstrinsicType(type)) {
      let nameOfType = type.name;
      const returnDescription = blockTags?.['@returns']?.map(({ text }) => text).join('');
      return `\`${nameOfType}\`${returnDescription ? ` - ${returnDescription}` : ''}`;
    }

    console.error(type);
    throw new Error(`Return Type function not yet implemented for type ${type.type}`)
  }

  let comment: Comment;
  const validReturnTypes = new Set();
  let returnType = '';
  signatures.forEach(signature => {
    if (signature.comment) {
      if (comment !== undefined) {
        throw new Error('Multiple comments defined for return signatures');
      }
      comment = signature.comment;
    }
    const { type } = signature;
    if (type === undefined) {
      throw new Error('No type defined for signature');
    }
    if (!isReferenceType(type)) {
      throw new Error(`Unsupported type: ${type.type}`);
    }
    if (returnType !== '' && returnType !== type.name) {
      throw new Error(`Conflicting return types in signatures: ${returnType} vs ${type.name}}`)
    }
    returnType = type.name;
    if (!('typeArguments' in type)) {
      throw new Error('No type arguments defined for type');
    }
    const { typeArguments } = type;
    typeArguments?.forEach(type => {
      if (isUnionType(type)) {
        type.types.forEach(t => {
          if (isInstrinsicType(t) || isReferenceType(t)) {
            validReturnTypes.add(t.name);
          } else {
            throw new Error(`Unsupported type when trying to handle union type while collecting valid signatures: ${type.type} ${t.type}`);
          }
        });
      } else if (isInstrinsicType(type)) {
        validReturnTypes.add(type.name);
      } else if (isReferenceType(type)) {
        validReturnTypes.add(type.name);
      } else {
        throw new Error(`Unsupported type when trying to collect valid signatures: ${type.type}`);
      }
    });
  })

  const nameOfType = `${returnType}<${Array.from(validReturnTypes).join(' | ')}>`;
  const returnDescription = blockTags?.['@returns']?.map(({ text }) => text).join('');
  return `\`${nameOfType}\`${returnDescription ? ` - ${returnDescription}` : ''}`;
}

const getContentForMethod = (method: DeclarationReflection, definitions: Definitions, i: number) => {
  const {
    name,
    signatures,
    sources,
  } = method;

  if (!sources?.length) {
    throw new Error(`No sources found for ${name}`);
  }
  if (!signatures?.length) {
    throw new Error(`No signatures found in ${name}`);
  }
  const signature = signatures[0] as SignatureReflection & { typeParameter?: TypeParameterReflection[] };
  const { comment, parameters, typeParameter: typeParameters } = signature;
  // if (!comment) {
  //   throw new Error(`No comment found in method ${name}`);
  // }

  const { description, code: codeSnippet, blockTags } = getTextSummary(comment);
  let source;
  try {
    source = getSource(sources);
  } catch(e) {
    console.error(JSON.stringify(method, null, 2));
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

    `# ${name}`,
    description,
    ...(codeSnippet ? [
      `## Example`,
      codeSnippet,
    ] : []),
    source,
    ...(parameters ? [
      `## Parameters`,
      getParameters(parameters, definitions, getAsObj<TypeParameterReflection>(typeParameters || [], t => t.name)),
    ] : []),
    ...(method.name === 'upscale' ? writePlatformSpecificDefinitions(definitions, getAsObj<TypeParameterReflection>(typeParameters || [], t => t.name)) : []),
    `## Returns`,
    getReturnType(signatures, blockTags),
  ].filter(Boolean).join('\n\n');
  return content;
}

/****
 * Main function
 */
async function main() {
  const projectReflection = await getUpscalerAsTree();
  const definitions = getChildren(projectReflection);
  const exports = Object.values(definitions.classes);
  for (let i = 0; i < exports.length; i++) {
    const xport = exports[i];
    if (VALID_EXPORTS_FOR_WRITING_DOCS.includes(xport.name)) {
      const { children } = xport;
      if (!children) {
        throw new Error(`No methods found in export ${xport.name}`);
      }
      const methods = sortChildrenByLineNumber<DeclarationReflection>(children);
      for (let j = 0; j < methods.length; j++) {
        const method = methods[j];
        if (VALID_METHODS_FOR_WRITING_DOCS.includes(method.name)) {
          const content = getContentForMethod(method, definitions, j);
          if (content) {
            const target = path.resolve(EXAMPLES_DOCS_DEST, `${method.name}.md`);
            await mkdirp(path.dirname(target));
            writeFile(target, content.trim(), 'utf-8');
          }
        } else {
          console.log(`** Ignoring method ${method.name}`);
        }
      }
    }
  }
}

/****
 * Functions to expose the main function as a CLI tool
 */

if (require.main === module) {
  (async () => {

    await main();
  })();
}
