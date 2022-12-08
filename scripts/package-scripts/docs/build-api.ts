import { mkdirp, writeFile } from 'fs-extra';
import path from 'path';
import { Application, ArrayType, Comment, CommentTag, DeclarationReflection, IntrinsicType, LiteralType, ParameterReflection, ProjectReflection, ReferenceType, SomeType, SourceReference, TSConfigReader, TypeDocReader, UnionType } from 'typedoc';
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

  const getAsObj = (arr: DeclarationReflection[]) => arr.reduce((obj, item) => ({
    ...obj,
    [item.name]: item,
  }), {} as Record<string, DeclarationReflection>);

  return {
    methods: getAsObj(parsedChildren.methods),
    constructors: getAsObj(parsedChildren.constructors),
    functions: getAsObj(parsedChildren.functions),
    types: getAsObj(parsedChildren.types),
    interfaces: getAsObj(parsedChildren.interfaces),
    classes: getAsObj(parsedChildren.classes),
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

const getTypeName = (_type?: SomeType): {
  type: 'reference' | 'array' | 'literal' | 'intrinsic',
  name: string;
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
    return {
      type: 'literal',
      name: 'COMING SOON',
    };
    // const lastType = _type.types.pop();
    // if (!lastType || !isLiteralType(lastType)) {
    //   console.error(_type);
    //   throw new Error('Unsupported');
    // }
    // return {
    //   type: 'literal',
    //   name: 'COMING SOON',
    // };
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

const writeParameter = (parameter: ParameterReflection | DeclarationReflection, matchingType?: DeclarationReflection) => {
  const comment = getSummary(parameter.comment);
  const { type, name } = getTypeName(parameter.type);
  const url = getURLFromSources(matchingType?.sources);
  const parsedName = `${name}${type === 'array' ? '[]' : ''}`;
  const linkedName = url ?  `[${parsedName}](${url})` : parsedName;
  return [
    '-',
    `**\`${parameter.name}${parameter.flags?.isOptional ? '?' : ''}\`**:`,
    `_${linkedName}_`,
    comment ? ` - ${comment}` : undefined,
  ].filter(Boolean).join(' ');
};

const getParameters = (parameters: (ParameterReflection | DeclarationReflection)[], definitions: Definitions, depth = 0): string => {
  if (depth > 5) {
    throw new Error('Too many levels of depth');
  }
  const { interfaces, types } = definitions;
  return parameters.map((parameter) => {
    let { name: nameOfTypeDefinition } = getTypeName(parameter.type);
    let matchingType;
    if (!INTRINSIC_TYPES.includes(nameOfTypeDefinition) && parameter.type !== undefined && !isLiteralType(parameter.type)) {
      matchingType = interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition] || undefined;
      if (!matchingType) {
        // console.warn(parameter.type);
        // console.warn(`No matching type could be found for ${nameOfTypeDefinition}. Available interfaces are ${Object.keys(interfaces).join(', ')}. Available types are ${Object.keys(types).join(', ')}.`);
      }
    }
    const { children = [] } = matchingType || {};
    return [
      writeParameter(parameter, matchingType),
      getParameters(sortChildrenByLineNumber(children), definitions, depth + 1),
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
      nameOfType = `${nameOfType}<${typeArguments.map(getTypeName).map(({ name }) => name).join(', ')}>`;
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
  const { comment, parameters, type } = signatures[0];
  if (!comment) {
    throw new Error(`No comment found in method ${name}`);
  }

  const { description, code: codeSnippet, blockTags } = getTextSummary(comment);
  const source = getSource(sources);

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
      getParameters(parameters, definitions),
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
  // console.log(`Number of exports from index that we are considering: ${exports.length} items`)
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
          console.log(`Ignoring method ${method.name}`);
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
