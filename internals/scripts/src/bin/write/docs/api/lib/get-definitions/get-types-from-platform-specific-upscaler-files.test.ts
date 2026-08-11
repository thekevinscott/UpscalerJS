import { DeclarationReflection, ProjectReflection, ReflectionKind, SomeType } from "typedoc";
import {
  getPlatformSpecificUpscalerDeclarationReflections,
  getTypesFromPlatformSpecificUpscalerFile,
  getTypesFromPlatformSpecificUpscalerFiles,
  makeDeclarationReflection,
} from "./get-types-from-platform-specific-upscaler-files.js";
import { getPackageAsTree } from "./get-package-as-tree.js";

vi.mock('./get-package-as-tree.js', () => {
  return {
    getPackageAsTree: vi.fn(),
  };
});

describe('makeDeclarationReflection', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('gets a declaration reflection', () => {
    const decRef = makeDeclarationReflection('foo', {
      type: 'functions',
    } as unknown as SomeType);
    expect(decRef.name).toEqual('foo');
    expect(decRef.kind).toEqual(ReflectionKind.Function);
    expect(decRef.type).toEqual({
      type: 'functions',
    });
  })
});

describe('getPlatformSpecificUpscalerDeclarationReflections', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('throws if it cannot find a matching type', async () => {
    vi.mocked(getPackageAsTree).mockImplementation(async () => {
      return {
        children: [
          'foo',
          'bar',
        ],
      } as unknown as ProjectReflection;
    });

    await expect(getPlatformSpecificUpscalerDeclarationReflections('browser', {
      fileName: 'fileName',
      typeName: 'typeName',
    })).rejects.toThrow();
  });

  it('returns the matching type', async () => {
    const child = {
      name: 'foo',
    };
    vi.mocked(getPackageAsTree).mockImplementation(async () => {
      return {
        children: [child],
      } as unknown as ProjectReflection;
    });

    await expect(getPlatformSpecificUpscalerDeclarationReflections('browser', {
      fileName: 'fileName',
      typeName: child.name,
    })).resolves.toEqual(child);
  });
});

describe('getTypesFromPlatformSpecificUpscalerFile', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('gets types from platform specific upscaler file', async () => {
    const typeName = 'typeName';
    const child = {
      name: typeName,
      type: {
        type: 'functions',
      },
    };
    vi.mocked(getPackageAsTree).mockImplementation(async () => {
      return {
        children: [child],
      } as unknown as ProjectReflection;
    });
    const result = await getTypesFromPlatformSpecificUpscalerFile({
      fileName: 'fileName',
      typeName,
    });
    expect(result.declarationReflection.name).toEqual(typeName);
    expect(result.browser).toEqual(child);
    expect(result.node).toEqual(child);
  });
});

describe('getTypesFromPlatformSpecificFiles', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('iterates through files array', async () => {
    const typeName = 'typeName';
    const child = {
      name: typeName,
      type: {
        type: 'functions',
      },
    };
    vi.mocked(getPackageAsTree).mockImplementation(async () => {
      return {
        children: [child],
      } as unknown as ProjectReflection;
    });
    const result = await getTypesFromPlatformSpecificUpscalerFiles([{
      fileName: 'file1',
      typeName,
    }, {
      fileName: 'file2',
      typeName,
    }]);

    expect(result).toEqual([
      expect.objectContaining({
        declarationReflection: expect.any(DeclarationReflection),
        browser: child,
        node: child,
      }),
      expect.objectContaining({
        declarationReflection: expect.any(DeclarationReflection),
        browser: child,
        node: child,
      }),
    ]);
  });
});
