import { mkdirp, writeFile } from 'fs-extra';
import path from 'path';
import { Application, ArrayType, Comment, CommentTag, DeclarationReflection, IntrinsicType, LiteralType, ParameterReflection, ProjectReflection, ReferenceType, SignatureReflection, SomeType, SourceReference, TSConfigReader, TypeDocReader, TypeParameterReflection, UnionType } from 'typedoc';
import { CORE_DIR, DOCS_DIR, ROOT_DIR, UPSCALER_DIR } from '../utils/constants';

/****
 * Types
 */
interface Definitions {
  constructors: Record<string, DeclarationReflection>;
  methods: Record<string, DeclarationReflection>;
  interfaces: Record<string, DeclarationReflection>;
  types: Record<string, DeclarationReflection>;
  classes: Record<string, DeclarationReflection>;
  functions: Record<string, DeclarationReflection>;
}

/****
 * Constants
 */
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

/****
 * Utility functions
 */
const getUpscalerAsTree = (): ProjectReflection => {
  const upscalerTree: ProjectReflection = getPackageAsTree(UPSCALER_DIR, path.resolve(UPSCALER_DIR, 'tsconfig.esm.json'));
  const coreTree = getPackageAsTree(CORE_DIR, path.resolve(CORE_DIR, 'tsconfig.json'));
  // const TFJS_DIR = path.resolve(ROOT_DIR, 'node_modules', '@tensorflow', 'tfjs');
  // const tfjsTree = getPackageAsTree(TFJS_DIR);
  upscalerTree.children = [
    upscalerTree,
    coreTree,
    // tfjsTree,
  ].reduce((arr, tree) => arr.concat(tree.children || []), [] as DeclarationReflection[]);
  return upscalerTree;
}

const getPackageAsTree = (src: string, tsconfig: string): ProjectReflection => {
  const app = new Application();

  app.options.addReader(new TSConfigReader())
  app.options.addReader(new TypeDocReader())

  app.bootstrap({
    // typedoc options here
    entryPoints: [path.resolve(src, 'src')],
    tsconfig,
  });

  const project = app.convert();

  if (project) {
    return app.serializer.projectToObject(project) as ProjectReflection;
  } else {
    throw new Error('No project was converted.')
  }
}

function getAsObj <T>(arr: T[], getKey: (item: T) => string) {
  return arr.reduce((obj, item) => ({
    ...obj,
    [getKey(item)]: item,
  }), {} as Record<string, T>);
}

const getKindStringKey = (kindString: string = '') => {
  switch (kindString) {
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

const getChildren = (projectReflection: ProjectReflection): Definitions => {
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
    constructors: [] as DeclarationReflection[],
    methods: [] as DeclarationReflection[],
    functions: [] as DeclarationReflection[],
    interfaces: [] as DeclarationReflection[],
    types: [] as DeclarationReflection[],
    classes: [] as DeclarationReflection[],
  });

  return {
    methods: getAsObj<DeclarationReflection>(parsedChildren.methods, i => i.name),
    constructors: getAsObj<DeclarationReflection>(parsedChildren.constructors, i => i.name),
    functions: getAsObj<DeclarationReflection>(parsedChildren.functions, i => i.name),
    types: getAsObj<DeclarationReflection>(parsedChildren.types, i => i.name),
    interfaces: getAsObj<DeclarationReflection>(parsedChildren.interfaces, i => i.name),
    classes: getAsObj<DeclarationReflection>(parsedChildren.classes, i => i.name),
  };
};

const getSummary = (comment?: Comment) => {
  return comment?.summary.map(({ text }) => text).join('');
}

const getTextSummary = ({ summary, blockTags }: Comment) => {
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
  const {
    fileName,
    line,
    // character, 
    url,
  } = source;
  if (!url) {
    throw new Error(`No URL defined for source ${fileName} at line ${line}`);
  }
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

const isArrayType = (type: SomeType): type is ArrayType => type.type === 'array';
const isReferenceType = (type: SomeType): type is ReferenceType => type.type === 'reference';
const isLiteralType = (type: SomeType): type is LiteralType => type.type === 'literal';
const isInstrinsicType = (type: SomeType): type is IntrinsicType => type.type === 'intrinsic';
const isUnionType = (type: SomeType): type is UnionType => type.type === 'union';

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
  type: 'reference' | 'array' | 'literal' | 'intrinsic',
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
    }

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

  if (isUnionType(_type)) {
    let includeURL = true;
    const name = _type.types.map(t => {
      if (isReferenceType(t)) {
        if (definitions === undefined) {
          throw new Error('Union type was provided and a reference type was found in the union, but no definitions are present.')
        }
        const { interfaces, types } = definitions;
        const matchingType = interfaces[t.name] || types[t.name];
        if (!matchingType?.type) {
          throw new Error(`No matching type found for literal ${t.name} in union`);
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
        console.log('matchingTypeType', JSON.stringify(matchingTypeType, null, 2));

        throw new Error(`Unsupported type of matching type ${matchingTypeType.type} in reference type of union type ${t.name}.`);
      } else if (isInstrinsicType(t)) {
        if (t.name === 'undefined') {
          // ignore an explicit undefined type; this should be better represented as an optional flag.
          return undefined;
        }
        return t.name;
      }
      throw new Error(`Unsupported type in union type: ${t.type}`);
    }).filter(Boolean).join(' | ');
    return {
      type: 'literal',
      includeURL,
      name: _type.types.map(t => {
        if (isReferenceType(t)) {
          if (definitions === undefined ) {
            throw new Error('Union type was provided and a reference type was found in the union, but no definitions are present.')
          }
          const { interfaces, types } = definitions;
          const matchingType = interfaces[t.name] || types[t.name];
          if (!matchingType?.type) {
            throw new Error(`No matching type found for literal ${t.name} in union`);
          }
          const matchingTypeType = matchingType.type;
          if (isLiteralType(matchingTypeType)) {
            return JSON.stringify(matchingTypeType.value);
          }
          if (matchingTypeType.type === 'reflection') {
            // Ignore reflection types
            return t.name;
          }
          console.log('matchingTypeType', JSON.stringify(matchingTypeType, null, 2));

          throw new Error(`Unsupported type of matching type ${matchingTypeType.type} in reference type of union type ${t.name}.`);
        } else if (isInstrinsicType(t)) {
          if (t.name === 'undefined') {
            // ignore an explicit undefined type; this should be better represented as an optional flag.
            return undefined;
          }
          return t.name;
        }
        throw new Error(`Unsupported type in union type: ${t.type}`);
      }).filter(Boolean).join(' | '),
    };
  }

  console.error(_type)

  throw new Error(`Unsupported type: ${_type.type}`)
}

const getURLFromSources = (sources?: SourceReference[]) => {
  if (sources?.length) {
    const { url } = sources?.[0] || {};
    if (url) {
      return rewriteURL(url);
    }
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

const writeParameter = (parameter: ParameterReflection | DeclarationReflection, matchingType: undefined | DeclarationReflection | TypeParameterReflection, definitions: Definitions) => {
  const comment = getSummary(parameter.comment);
  const { type, name, includeURL = true } = getReferenceTypeOfParameter(parameter.type, definitions);
  const url = includeURL ? getURLFromSources(matchingType?.sources) : undefined;
  const parsedName = `${name}${type === 'array' ? '[]' : ''}`;
  const linkedName = url ?  `[${parsedName}](${url})` : parsedName;
  return [
    '-',
    `**\`${parameter.name}${parameter.flags?.isOptional ? '?' : ''}\`**:`,
    `_${linkedName}_`,
    comment ? ` - ${comment}` : undefined,
  ].filter(Boolean).join(' ');
};

const getParameters = (parameters: (ParameterReflection | DeclarationReflection)[], definitions: Definitions, typeParameters: Record<string, TypeParameterReflection> = {}, depth = 0): string => {
  if (depth > 5) {
    throw new Error('Too many levels of depth');
  }
  const { interfaces, types } = definitions;
  return parameters.map((parameter) => {
    let { name: nameOfTypeDefinition } = getReferenceTypeOfParameter(parameter.type);
    let matchingType: undefined | DeclarationReflection | TypeParameterReflection = undefined;
    if (!INTRINSIC_TYPES.includes(nameOfTypeDefinition) && parameter.type !== undefined && !isLiteralType(parameter.type)) {
      matchingType = interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
      if (!matchingType) {
        // it's possible that this type is a generic type; in which case, replace the generic with the actual type it's extending
        matchingType = typeParameters[nameOfTypeDefinition];
        if (matchingType) {
          nameOfTypeDefinition = (matchingType as any).type.name;
          matchingType = interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
          parameter.type = matchingType.type;
        }
      }
      if (!matchingType) {
        // console.warn(parameter.type);
        // console.warn(`No matching type could be found for ${nameOfTypeDefinition}. Available interfaces are ${Object.keys(interfaces).join(', ')}. Available types are ${Object.keys(types).join(', ')}.`);
      }
    }
    const { children = [] } = matchingType || {};
    return [
      writeParameter(parameter, matchingType, definitions),
      getParameters(sortChildrenByLineNumber(children), definitions, typeParameters, depth + 1),
    ].filter(Boolean).map(line => Array(depth * 2).fill(' ').join('') + line).join('\n');
  }).filter(Boolean).join('\n');
};

const getReturnType = (type?: SomeType, blockTags?: Record<string, CommentTag['content']>) => {
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
  const { comment, parameters, type, typeParameter: typeParameters } = signature;
  if (!comment) {
    throw new Error(`No comment found in method ${name}`);
  }

  const { description, code: codeSnippet, blockTags } = getTextSummary(comment);
  try {
    const source = getSource(sources);
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
    `## Returns`,
    getReturnType(type, blockTags),
  ].join('\n\n');
  return content;
}

/****
 * Main function
 */
async function main() {
  const projectReflection: ProjectReflection = getUpscalerAsTree();
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
