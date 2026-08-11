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
  it('returns an array of DeclarationReflections', async () => {
    vi.mocked(getPackageAsTree).mockImplementation(async () => {
      return {
        children: [
          'foo',
          'bar',
        ],
      } as unknown as ProjectReflection;
    });
    await expect(getDeclarationReflectionsFromPackages([
      {
        tsconfigPath: 'tsconfig',
        projectRoot: 'projectRoot',
      },
    ])).resolves.toEqual(['foo', 'bar']);
  });

  it('throws if receiving an empty children array', async () => {
    vi.mocked(getPackageAsTree).mockImplementation(async () => {
      return {
        children: [],
      } as unknown as ProjectReflection;
    });
    await expect(getDeclarationReflectionsFromPackages([
      {
        tsconfigPath: 'tsconfig',
        projectRoot: 'projectRoot',
      },
    ])).rejects.toThrow();
  });
});
