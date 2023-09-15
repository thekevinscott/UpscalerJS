import { ProjectReflection } from "typedoc";
import { getDeclarationReflectionsFromPackages } from "./get-declaration-reflections-from-packages.js";
import { getPackageAsTree } from "./get-package-as-tree.js";

vi.mock('./get-package-as-tree.js', () => {
  return {
    getPackageAsTree: vi.fn(),
  }
});

describe('getDeclarationReflectionsFromPackages', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('returns an array of DeclarationReflections', () => {
    vi.mocked(getPackageAsTree).mockImplementation(() => {
      return {
        children: [
          'foo',
          'bar',
        ],
      } as unknown as ProjectReflection;
    });
    expect(getDeclarationReflectionsFromPackages([
      {
        tsconfigPath: 'tsconfig',
        projectRoot: 'projectRoot',
      },
    ])).toEqual(['foo', 'bar']);
  });

  it('throws if receiving an empty children array', () => {
    vi.mocked(getPackageAsTree).mockImplementation(() => {
      return {
        children: [],
      } as unknown as ProjectReflection;
    });
    expect(() => getDeclarationReflectionsFromPackages([
      {
        tsconfigPath: 'tsconfig',
        projectRoot: 'projectRoot',
      },
    ])).toThrow();
  });
});
