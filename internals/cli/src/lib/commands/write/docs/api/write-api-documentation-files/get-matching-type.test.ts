import { ArrayType, DeclarationReflection, ReflectionKind } from "typedoc";
import { getMatchingType } from "./get-matching-type.js";
import { getReferenceTypeOfParameter } from "./get-reference-type-of-parameter.js";
import * as constants from "../constants.js";
import { Definitions, isLiteralType } from "../types.js";

vi.mock('../types.js', async () => {
  const actualTypes = await import('../types.js');
  return {
    ...actualTypes,
    isLiteralType: vi.fn().mockImplementation(() => false),
  }
});

vi.mock('../constants.js', () => ({
  INTRINSIC_TYPES: [],
  EXTERNALLY_DEFINED_TYPES: [],
}));

vi.mock('./get-reference-type-of-parameter.js', () => ({
  getReferenceTypeOfParameter: vi.fn(),
}));

const makeNewExternalType = (name: string, _url: string): DeclarationReflection => {
  const type = new DeclarationReflection(name, ReflectionKind['SomeType']);
  type.sources = [];
  return type;
};

const Interface = {
  name: 'Interface',
  kind: ReflectionKind.Interface,
};
const TypeAlias = {
  name: 'TypeAlias',
  kind: ReflectionKind.TypeAlias,
};
const mockDefinitions = (): Definitions => {
  const Constructor = {
    name: 'Constructor',
    kind: ReflectionKind.Constructor,
  };
  const Method = {
    name: 'Method',
    kind: ReflectionKind.Method,
  };
  const Class = {
    name: 'Class',
    kind: ReflectionKind.Class,
  };
  const Function = {
    name: 'Function',
    kind: ReflectionKind.Function,
  };
  const Enum = {
    name: 'Enum',
    kind: ReflectionKind.Enum,
  };
  const PlatformSpecific = {
    declarationReflection: {
      name: 'PlatformSpecific',
      kind: ReflectionKind.Constructor,
    },
    browser: {},
    node: {},
  };
  return {
    methods: {
      Method,
    },
    constructors: {
      Constructor,
      PlatformSpecific,
    },
    functions: {
      Function,
    },
    types: {
      TypeAlias,
    },
    interfaces: {
      Interface,
    },
    classes: {
      Class,
    },
    enums: {
      Enum,
    },
  } as unknown as Definitions;
}

describe('getMatchingType', () => {
  beforeEach(() => {
    vi.spyOn(constants, 'INTRINSIC_TYPES', 'get').mockReturnValue([]);
    vi.spyOn(constants, 'EXTERNALLY_DEFINED_TYPES', 'get').mockReturnValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined if intrinsic types includes the name of the type definition', () => {
    const definitions = mockDefinitions();
    const parameter = new DeclarationReflection('foo', ReflectionKind.Parameter);
    constants.INTRINSIC_TYPES.push('foo');
    vi.mocked(getReferenceTypeOfParameter).mockImplementation(() => ({
      name: 'foo',
      type: 'literal',
    }) as ReturnType<typeof getReferenceTypeOfParameter>);
    expect(getMatchingType(parameter, definitions, {})).toEqual(undefined);
  });

  it('returns undefined if parameter type is undefined', () => {
    const definitions = mockDefinitions();
    const parameter = new DeclarationReflection('foo', ReflectionKind.Parameter);
    parameter.type = undefined;
    vi.mocked(getReferenceTypeOfParameter).mockImplementation(() => ({
      name: 'foo',
      type: 'literal'
    }) as ReturnType<typeof getReferenceTypeOfParameter>);
    expect(getMatchingType(parameter, definitions, {})).toEqual(undefined);
  });

  it('returns undefined if it is a literal type', () => {
    const definitions = mockDefinitions();
    const parameter = new DeclarationReflection('foo', ReflectionKind.Parameter);
    parameter.type = { type: 'array' } as ArrayType;
    vi.mocked(getReferenceTypeOfParameter).mockImplementation(() => ({
      name: 'foo',
      type: 'literal'
    }) as ReturnType<typeof getReferenceTypeOfParameter>);
    vi.mocked(isLiteralType).mockImplementation(() => true)
    expect(getMatchingType(parameter, definitions, {})).toEqual(undefined);
  });

  it('returns an externally defined type if defined', () => {
    const definitions = mockDefinitions();
    const parameter = new DeclarationReflection('foo', ReflectionKind.Parameter);
    parameter.type = { type: 'array' } as ArrayType;
    const externalType = makeNewExternalType('Foo', 'https://foo.com');
    vi.spyOn(constants, 'EXTERNALLY_DEFINED_TYPES', 'get').mockReturnValue({
      Foo: externalType,
    });
    vi.mocked(getReferenceTypeOfParameter).mockImplementation(() => ({
      name: 'Foo',
      type: 'literal'
    }) as ReturnType<typeof getReferenceTypeOfParameter>);
    expect(getMatchingType(parameter, definitions, {})).toEqual(externalType);
  });

  it('returns a type defined on an interface', () => {
    const definitions = mockDefinitions();
    const parameter = new DeclarationReflection('foo', ReflectionKind.Parameter);
    parameter.type = { type: 'array' } as ArrayType;
    vi.mocked(getReferenceTypeOfParameter).mockImplementation(() => ({
      name: Interface.name,
      type: 'literal'
    }) as ReturnType<typeof getReferenceTypeOfParameter>);
    expect(getMatchingType(parameter, definitions, {})).toEqual(Interface);
  });

  it('returns a type defined on a types', () => {
    const definitions = mockDefinitions();
    const parameter = new DeclarationReflection('foo', ReflectionKind.Parameter);
    parameter.type = { type: 'array' } as ArrayType;
    vi.mocked(getReferenceTypeOfParameter).mockImplementation(() => ({
      name: TypeAlias.name,
      type: 'literal'
    }) as ReturnType<typeof getReferenceTypeOfParameter>);
    expect(getMatchingType(parameter, definitions, {})).toEqual(TypeAlias);
  });

  // it('returns a type parameter if defined', () => {
  //   const definitions = mockDefinitions();
  //   const parameter = new DeclarationReflection('parameter', ReflectionKind.Parameter);
  //   // parameter.type = 'foo';
  //   vi.mocked(getReferenceTypeOfParameter).mockImplementation(() => ({
  //     name: 'foo',
  //     type: 'literal' as 'literal',
  //   }));
  //   const reflection = new DeclarationReflection('bar', ReflectionKind.Class);
  //   const typeReflection = new TypeParameterReflection('foo', reflection, undefined);
  //   expect(getMatchingType(parameter, definitions, {
  //     foo: typeReflection,
  //   })).toEqual();
  // });
});

