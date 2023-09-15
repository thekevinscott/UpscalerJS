import { getDefinitions } from "./get-definitions.js";
import { getAllDeclarationReflections } from "./get-all-declaration-reflections.js";
import { DeclarationReference, DeclarationReflection, ReflectionKind } from "typedoc";
import { Declaration } from "@schemastore/package";
import { PlatformSpecificFileDeclarationReflection } from "../types.js";

vi.mock('./get-all-declaration-reflections.js', () => ({
  getAllDeclarationReflections: vi.fn(),
}));

describe('getDefinitions()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws if given a bad "kind"', async () => {
    vi.mocked(getAllDeclarationReflections).mockImplementation(() => {
      return Promise.resolve([
        {
          kind: 'foo',
        }
      ] as unknown as (DeclarationReflection | PlatformSpecificFileDeclarationReflection)[]);
    });

    await expect(() => getDefinitions()).rejects.toThrow();
  });

  it('gets definitions', async () => {
    const Constructor = {
      name: 'Constructor',
      kind: ReflectionKind.Constructor,
    };
    const Method = {
      name: 'Method',
      kind: ReflectionKind.Method,
    };
    const Interface = {
      name: 'Interface',
      kind: ReflectionKind.Interface,
    };
    const TypeAlias = {
      name: 'TypeAlias',
      kind: ReflectionKind.TypeAlias,
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
    vi.mocked(getAllDeclarationReflections).mockImplementation(() => {
      return Promise.resolve([
        PlatformSpecific,
        Constructor,
        Method,
        Interface,
        TypeAlias,
        Class,
        Function,
        Enum,
      ] as (DeclarationReflection | PlatformSpecificFileDeclarationReflection)[]);
    });

    const result = await getDefinitions();
    expect(result).toEqual({
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
    });
  });
});
