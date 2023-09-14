import { DeclarationReflection, LiteralType, ProjectReflection, ReflectionKind, SomeType } from "typedoc";
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
    vi.resetAllMocks();
  });
  it('gets a declaration reflection', () => {
    const decRef = makeDeclarationReflection('foo', ReflectionKind.Function, 'bar' as unknown as SomeType);
    expect(decRef.name).toEqual('foo');
    expect(decRef.kind).toEqual(ReflectionKind.Function);
    expect(decRef.type).toEqual('bar');
  })
});

describe('getPlatformSpecificUpscalerDeclarationReflections', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('throws if it cannot find a matching type', () => {
    vi.mocked(getPackageAsTree).mockImplementation(() => {
      return {
        children: [
          'foo',
          'bar',
        ],
      } as unknown as ProjectReflection;
    });

    expect(() => getPlatformSpecificUpscalerDeclarationReflections('browser', {
      fileName: 'fileName',
      typeName: 'typeName',
    })).toThrow();
  });

  it('throws if it cannot find a matching type', () => {
    const child = {
      name: 'foo',
    };
    vi.mocked(getPackageAsTree).mockImplementation(() => {
      return {
        children: [child],
      } as unknown as ProjectReflection;
    });

    expect(getPlatformSpecificUpscalerDeclarationReflections('browser', {
      fileName: 'fileName',
      typeName: child.name,
    })).toEqual(child);
  });
});

describe('getTypesFromPlatformSpecificUpscalerFile', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('gets types from platform specific upscaler file', () => {
    const typeName = 'typeName';
    const child = {
      name: typeName,
    };
    vi.mocked(getPackageAsTree).mockImplementation(() => {
      return {
        children: [child],
      } as unknown as ProjectReflection;
    });
    const result = getTypesFromPlatformSpecificUpscalerFile({
      fileName: 'fileName',
      typeName,
    });
    expect(result.declarationReflection.name).toEqual(typeName);
    expect(result.browser).toEqual(child);
    expect(result.node).toEqual(child);
  });

  it('throws if there is a mismatch between platforms', () => {
    const typeName = 'typeName';
    vi.mocked(getPackageAsTree).mockImplementation((srcPath: string) => {
      const child = srcPath.includes('browser') ? {
        name: typeName,
        type: 'browser',
      } : {
        name: typeName,
        type: 'node',
      };
      return {
        children: [child],
      } as unknown as ProjectReflection;
    });
    expect(() => getTypesFromPlatformSpecificUpscalerFile({
      fileName: 'fileName',
      typeName,
    })).toThrow();
  });
});

describe('getTypesFromPlatformSpecificFiles', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('iterates through files array', async () => {
    const typeName = 'typeName';
    const child = {
      name: typeName,
      type: 'sometype',
    };
    vi.mocked(getPackageAsTree).mockImplementation(() => {
      return {
        children: [child],
      } as unknown as ProjectReflection;
    });
    const result = await getTypesFromPlatformSpecificUpscalerFiles([{
      fileName: 'file1',
      typeName: typeName,
    }, {
      fileName: 'file2',
      typeName: typeName,
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
