import path from 'path';
import {
  mkdirp,
  writeFile,
} from 'fs-extra';
import {
  Application,
  DeclarationReflection as TypedocDeclarationReflection,
  TSConfigReader,
  TypeDocReader,
  ReflectionKind,
} from 'typedoc';
import { scaffoldDependenciesForUpscaler } from '../build-upscaler';
import { Platform } from '../prompt/types';
import { CORE_DIR, DOCS_DIR, UPSCALER_DIR } from '../utils/constants';
import { clearOutMarkdownFiles } from './utils/clear-out-markdown-files';
import { getSharedArgs, SharedArgs } from './types';
import {
  CommentDisplayPart,
  CommentTag,
  ParameterReflection,
  ArrayType,
  UnionType,
  IntersectionType,
  IntrinsicType,
  LiteralType,
  ReferenceType,
  SomeType,
  Comment,
  SignatureReflection,
  SourceReference,
  DeclarationReflection,
  TypeParameterReflection,
} from 'typedoc/dist/lib/serialization/schema';

const REPO_ROOT = 'https://github.com/thekevinscott/UpscalerJS';
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
  enums: Record<string, DecRef>;
}

interface PlatformSpecificDeclarationReflection extends Omit<DeclarationReflection, 'kind' | 'id' | 'flags'> {
  kind: 'Platform Specific Type';
  node: DeclarationReflection;
  browser: DeclarationReflection;
}

const getSummary = (comment?: Comment) => comment?.summary.map(({ text }) => text).join('');
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
};


const isDeclarationReflection = (reflection?: DecRef): reflection is DeclarationReflection => reflection?.kind !== 'Platform Specific Type';
const isArrayType = (type: SomeType): type is ArrayType => type.type === 'array';
const isReferenceType = (type: SomeType): type is ReferenceType => type.type === 'reference';
const isLiteralType = (type: SomeType): type is LiteralType => type.type === 'literal';
const isInstrinsicType = (type: SomeType): type is IntrinsicType => type.type === 'intrinsic';
const isUnionType = (type: SomeType): type is UnionType => type.type === 'union';
const isIntersectionType = (type: SomeType): type is IntersectionType => type.type === 'intersection';

const getURLFromSources = (matchingType: undefined | DecRef | TypeParameterReflection) => {
  if (!matchingType) {
    return undefined;
  }
  if ('sources' in matchingType) {
    const sources = matchingType.sources;
    if (sources?.length) {
      const { url } = sources?.[0] || {};
      if (url?.startsWith(REPO_ROOT)) {
        return rewriteURL(url);
      }
      return url;
    }
  }

  return undefined;
};

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
      };
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
    const typeArg = refType.typeArguments?.filter(typeArg => typeArg.type === 'reference').pop();
    if (!typeArg || !('name' in typeArg)) {
      throw new Error('No type arguments found on intersection type.');
    }
    return {
      type: 'literal',
      name: typeArg.name,
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
          return `[${matchingTypeType.elements?.map(e => {
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
};

const writePlatformSpecificParameter = (platform: string, parameter: DeclarationReflection, definitions: Definitions) => {
  const comment = getSummary(parameter.comment);
  const { type, name } = getReferenceTypeOfParameter(parameter.type, definitions);
  const url = getURLFromSources(parameter);
  const parsedName = `${name}${type === 'array' ? '[]' : ''}`;
  return [
    '-',
    `**[${platform}](${url})**:`,
    `\`${parsedName}\``,
    comment ? ` - ${comment}` : undefined,
  ].filter(Boolean).join(' ');
};


const writePlatformSpecificDefinitions = (definitions: Definitions): string => {
  const platformSpecificTypes: PlatformSpecificDeclarationReflection[] = [];
  for (const type of Object.values(definitions.types)) {
    if (!isDeclarationReflection(type)) {
      platformSpecificTypes.push(type);
    }
  }
  return platformSpecificTypes.map(parameter => [
    writePlatformSpecificParameter('Browser', parameter.browser, definitions),
    writePlatformSpecificParameter('Node', parameter.node, definitions),
  ].join('\n')).join('\n');
};


/****
 * Constants
 */
const UPSCALER_TSCONFIG_PATH = path.resolve(UPSCALER_DIR, 'tsconfig.esm.json');
const UPSCALER_SRC_PATH = path.resolve(UPSCALER_DIR, 'src');
const CORE_TSCONFIG_PATH = path.resolve(CORE_DIR, 'tsconfig.json');
const CORE_SRC_PATH = path.resolve(CORE_DIR, 'src');
const EXAMPLES_DOCS_DEST = path.resolve(DOCS_DIR, 'docs/documentation/api');
const VALID_EXPORTS_FOR_WRITING_DOCS = ['default'];
const VALID_METHODS_FOR_WRITING_DOCS = [
  'constructor', 
  'upscale',
  'execute',
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
const TYPES_TO_EXPAND: Record<string, string[]> = {
  'upscale': ['Input', 'Progress'],
  'warmup': ['WarmupSizes'],
}
const EXPANDED_TYPE_CONTENT: Record<string, (definitions: Definitions, typeParameters: Record<string, TypeParameterReflection>) => string> = {
  'Input': (definitions) => writePlatformSpecificDefinitions(definitions),
  'WarmupSizes': () => ([
    "- `number` - a number representing both the size (width and height) of the patch.",
    "- `{patchSize: number; padding?: number}` - an object with the `patchSize` and optional `padding` properties.",
    "- `number[]` - an array of numbers representing the size (width and height) of the patch.",
    "- `{patchSize: number; padding?: number}[]` - an array of objects with the `patchSize` and optional `padding` properties.",
  ].join('\n')),
  'Progress': () => ([
    'The progress callback function has the following four parameters:',
    '- `progress` - a number between 0 and 1 representing the progress of the upscale.',
    '- `slice` - a string or 3D tensor representing the current slice of the image being processed. The type returned is specified by the `progressOutput` option, or if not present, the `output` option, or if not present, string for the browser and tensor for node.',
    '- `row` - the row of the image being processed.',
    '- `col` - the column of the image being processed.',
    '',
    '[See the guide on progress for more information.](/documentation/guides/browser/usage/progress)',
  ].join('\n')),
};
// define special type information that is external
const makeNewExternalType = (name: string, _url: string): DeclarationReflection => {
  const type = new TypedocDeclarationReflection(name, ReflectionKind['SomeType']);
  // const source = new SourceReference('', 0, 0);
  // source.url = url;
  type.sources = [];
  return type as DeclarationReflection;
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


const getPackageAsTree = (entryPoint: string, tsconfig: string, projectRoot: string) => {
  const app = new Application();

  app.options.addReader(new TSConfigReader());
  app.options.addReader(new TypeDocReader());

  app.bootstrap({
    entryPoints: [entryPoint],
    tsconfig,
  });

  const project = app.convert();

  if (project) {
    return app.serializer.projectToObject(project, projectRoot);
  }
  throw new Error('No project was converted.')
}

const getTypeFromPlatformSpecificFiles = async (fileName: string, typeName: string) => {
  const platforms: Platform[] = ['browser', 'node'];
  const platformSpecificTypes: DeclarationReflection[] = [];
  for (const platform of platforms) {
    await scaffoldDependenciesForUpscaler(platform);
    const imageBrowser = getPackageAsTree(
      path.resolve(UPSCALER_DIR, 'src', `${fileName}.${platform}.ts`),
      path.resolve(UPSCALER_DIR, `tsconfig.docs.${platform}.json`),
      UPSCALER_DIR,
    );
    const matchingType = imageBrowser.children?.filter(child => child.name === typeName).pop();
    if (!matchingType) {
      throw new Error(`Could not find input from ${fileName}.${platform}.ts`);
    }
    platformSpecificTypes.push(matchingType);
  }

  const platformSpecificType: PlatformSpecificDeclarationReflection = {
    name: typeName,
    variant: 'declaration',
    kind: 'Platform Specific Type',
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

const getKindStringKey = (kindString: 'Platform Specific Type' | ReflectionKind) => {
  switch (kindString) {
    case 'Platform Specific Type':
      return 'types';
    case ReflectionKind.Constructor:
      return 'constructors';
    case ReflectionKind.Method:
      return 'methods';
    case ReflectionKind.Interface:
      return 'interfaces';
    case ReflectionKind.TypeAlias:
      return 'types';
    case ReflectionKind.Class:
      return 'classes';
    case ReflectionKind.Function:
      return 'functions';
    case ReflectionKind.Enum:
      return 'enums';
    default:
      throw new Error(`Unexpected kind string: ${kindString}`);
  }
}

const getDefinitions = async (): Promise<Definitions> => {
  await scaffoldDependenciesForUpscaler('node');
  const upscalerTree = getPackageAsTree(
    UPSCALER_SRC_PATH, 
    UPSCALER_TSCONFIG_PATH,
    UPSCALER_DIR,
  );
  const coreTree = getPackageAsTree(
    CORE_SRC_PATH, 
    CORE_TSCONFIG_PATH,
    CORE_DIR,
  );
  const platformSpecificTypes = await getTypesFromPlatformSpecificFiles();
  if (!upscalerTree.children) {
    throw new Error('No children were found on upscaler tree object. Indicates an error in the returned structure from getPackageAsTree');
  }
  const children = [
    ...upscalerTree.children,
    ...(coreTree.children || []),
    ...(platformSpecificTypes.children || []),
  ];

  const parsedChildren = children.reduce((obj, child) => {
    const { kind } = child;
    const key = getKindStringKey(kind);
    if (!key) {
      throw new Error(`Unexpected kind string: ${kind}`);
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
    enums: [] as DecRef[],
  });

  return {
    methods: getAsObj<DecRef>(parsedChildren.methods, i => i.name),
    constructors: getAsObj<DecRef>(parsedChildren.constructors, i => i.name),
    functions: getAsObj<DecRef>(parsedChildren.functions, i => i.name),
    types: getAsObj<DecRef>(parsedChildren.types, i => i.name),
    interfaces: getAsObj<DecRef>(parsedChildren.interfaces, i => i.name),
    classes: getAsObj<DecRef>(parsedChildren.classes, i => i.name),
    enums: getAsObj<DecRef>(parsedChildren.enums, i => i.name),
  };
};

const getTextSummary = (name: string, comment?: Comment): {
  codeSnippet?: string;
  description?: string;
  blockTags?: Record<string, CommentDisplayPart[]>;
} => {
  if (comment === undefined) {
    return {};
  }
  const { summary, blockTags } = comment;
  const expectedCodeSnippet = summary.pop();
  if (expectedCodeSnippet?.kind !== 'code') {
    throw new Error(`Expected code snippet not found for ${name}`);
  }
  // const { text, code } = summary.reduce((obj, item) => {
  //   return {
  //     ...obj,
  //     [item.kind]: item.text.trim(),
  //   }
  // }, {
  //   text: '',
  //   code: '',
  // });
  const text = summary.map(({ text }) => text).join('');
  return {
    blockTags: blockTags?.reduce((obj, blockTag) => {
      return {
        ...obj,
        [blockTag.tag]: blockTag.content,
      };
    }, {}),
    description: text.trim(),
    codeSnippet: expectedCodeSnippet.text.trim(),
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


function sortChildrenByLineNumber<T extends (DeclarationReflection)>(children: T[]) {
  return children.sort(({ sources: aSrc }, { sources: bSrc }) => {
    if (!aSrc?.length) {
      return 1;
    }
    if (!bSrc?.length) {
      return -1;
    }
    return aSrc[0].line - bSrc[0].line;
  });
};

// const isTypeParameterReflection = (reflection: DecRef | TypeParameterReflection): reflection is TypeParameterReflection => {
//   return 'parent' in reflection;
// }

const writeParameter = (methodName: string, parameter: ParameterReflection | DeclarationReflection, matchingType: undefined | DecRef | TypeParameterReflection, definitions: Definitions, childParameters: string) => {
  // if (matchingType !== undefined && !isTypeParameterReflection(matchingType) && !isDeclarationReflection(matchingType)) {
  //   // this is a platform-specify type specification. likely it is the input definition.
  //   const comment = getSummary(parameter.comment);
  //   const { type, name } = getReferenceTypeOfParameter(parameter.type, definitions);
  //   const parsedName = `\`${name}${type === 'array' ? '[]' : ''}\``;
  //   return [
  //     '-',
  //     `**${parameter.name}${parameter.flags?.isOptional ? '?' : ''}**:`,
  //     childParameters ? undefined : `[${parsedName}](#${name.toLowerCase()})`, // only show the type information if we're not expanding it
  //     comment ? ` - ${comment}` : undefined,
  //   ].filter(Boolean).join(' ');
  // }
  const comment = getSummary(parameter.comment);
  const { type, name, includeURL = true } = getReferenceTypeOfParameter(parameter.type, definitions);
  const parsedName = `${name}${type === 'array' ? '[]' : ''}`;

  let url: string | undefined;
  const typesToExpand = TYPES_TO_EXPAND[methodName === 'constructor' ? '_constructor' : methodName] || [];
  if (typesToExpand.includes(name)) {
    url = `#${name.toLowerCase()}`;
  } else if (includeURL) {
    url = getURLFromSources(matchingType);
  }
  const linkedName = url ? `[\`${parsedName}\`](${url})` : `\`${parsedName}\``;
  return [
    '-',
    `**${parameter.name}${parameter.flags?.isOptional ? '?' : ''}**:`,
    childParameters === '' ? linkedName : undefined, // only show the type information if we're not expanding it
    comment ? ` - ${comment.split('\n').join(" ")}` : undefined,
  ].filter(Boolean).join(' ');
};

const getMatchingType = (parameter: ParameterReflection | DeclarationReflection, definitions: Definitions, typeParameters: Record<string, TypeParameterReflection> = {}) => {
  const { classes, interfaces, types } = definitions;
  let { name: nameOfTypeDefinition } = getReferenceTypeOfParameter(parameter.type, definitions);
  let matchingType: undefined | PlatformSpecificDeclarationReflection | DeclarationReflection | TypeParameterReflection;
  if (!INTRINSIC_TYPES.includes(nameOfTypeDefinition) && parameter.type !== undefined && !isLiteralType(parameter.type)) {
    // first, check if it is a specially defined external type
    matchingType = EXTERNALLY_DEFINED_TYPES[nameOfTypeDefinition] || interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
    // console.log('matchingType', matchingType);
    if (!matchingType) {
      // it's possible that this type is a generic type; in which case, replace the generic with the actual type it's extending
      matchingType = typeParameters[nameOfTypeDefinition];
      if (matchingType) {
        nameOfTypeDefinition = matchingType.type.name;
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

const getParameters = (methodName: string, parameters: (ParameterReflection | DeclarationReflection)[], definitions: Definitions, typeParameters: Record<string, TypeParameterReflection> = {}, depth = 0): string => {
  if (depth > 5) {
    throw new Error('Too many levels of depth');
  }
  return parameters.map((parameter) => {
    const matchingType = getMatchingType(parameter, definitions, typeParameters);
    const { children = [] } = matchingType || {};
    const childParameters = getParameters(methodName, sortChildrenByLineNumber(children), definitions, typeParameters, depth + 1);
    return [
      writeParameter(methodName, parameter, matchingType, definitions, childParameters),
      childParameters,
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
      const nameOfType = type.name;
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

const writeExpandedTypeDefinitions = (methodName: string, definitions: Definitions, typeParameters: Record<string, TypeParameterReflection> = {}): string => {
  // this method is for writing out additional information on the types, below the parameters
  const typesToExpand = TYPES_TO_EXPAND[methodName === 'constructor' ? '_constructor' : methodName] || [];
  return typesToExpand.map(type => [
    `### \`${type}\``,
    EXPANDED_TYPE_CONTENT[type](definitions, typeParameters),
  ].join('\n')).join('\n');
}

const getContentForMethod = (method: DeclarationReflection, definitions: Definitions, i: number) => {
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
      "Alias for [`execute`](execute)",
    ].filter(Boolean).join('\n\n');

  }

  if (!sources?.length) {
    throw new Error(`No sources found for ${name}`);
  }
  if (!signatures?.length) {
    const { type: _type, ...m } = method;
    console.log(JSON.stringify(m, null, 2))
    throw new Error(`No signatures found in ${name}`);
  }
  const signature = signatures[0] as SignatureReflection & { typeParameter?: TypeParameterReflection[] };
  const { comment, parameters, typeParameter: typeParameters } = signature;
  // if (!comment) {
  //   throw new Error(`No comment found in method ${name}`);
  // }

  const { description, codeSnippet, blockTags } = getTextSummary(name, comment);
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
`# \`${name}\``,
    description,
    ...(codeSnippet ? [
      '## Example',
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

const getSortedMethodsForWriting = (definitions: Definitions) => {
  const exports = Object.values(definitions.classes);
  const methods: DeclarationReflection[] = [];
  for (const xport of exports) {
    if (VALID_EXPORTS_FOR_WRITING_DOCS.includes(xport.name)) {
      const { children } = xport;
      if (!children) {
        throw new Error(`No methods found in export ${xport.name}`);
      }
      sortChildrenByLineNumber(children).forEach(method => {
        if (VALID_METHODS_FOR_WRITING_DOCS.includes(method.name)) {
          methods.push(method);
        } else {
          console.log(`** Ignoring method ${method.name}`);
        }
      });
    }
  }
  return methods;
};

const writeAPIDocumentationFiles = async (methods: DeclarationReflection[], definitions: Definitions) => {
  await Promise.all(methods.map(async (method, i) => {
    const content = getContentForMethod(method, definitions, i);
    if (content) {
      const target = path.resolve(EXAMPLES_DOCS_DEST, `${method.name}.md`);
      await mkdirp(path.dirname(target));
      await writeFile(target, content.trim(), 'utf-8');
    } else {
      throw new Error(`No content for method ${method.name}`);
    }
  }))
};

const writeIndexFile = async (methods: DeclarationReflection[]) => {
  const contents = [
    '# API',
    '',
    'API Documentation for UpscalerJS.',
    '',
    'Available methods:',
    '',
    ...methods.map(method => `- [\`${method.name}\`](./${method.name})`),
  ].join('\n')
  await writeFile(path.resolve(EXAMPLES_DOCS_DEST, 'index.md'), contents, 'utf-8');
}

/****
 * Main function
 */
async function main({ shouldClearMarkdown }: SharedArgs = {}) {
  await mkdirp(EXAMPLES_DOCS_DEST);
  if (shouldClearMarkdown) {
    await clearOutMarkdownFiles(EXAMPLES_DOCS_DEST);
  }

  const definitions = await getDefinitions();
  const methods = getSortedMethodsForWriting(definitions);

  await Promise.all([
    writeAPIDocumentationFiles(methods, definitions),
    writeIndexFile(methods),
  ]);
}

/****
 * Functions to expose the main function as a CLI tool
 */

if (require.main === module) {
  (async () => {
    const sharedArgs = await getSharedArgs();
    await main({ ...sharedArgs });
  })();
}
