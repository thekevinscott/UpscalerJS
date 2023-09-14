import { getAllDeclarationReflections } from "./get-all-declaration-reflections.js";
import { getDeclarationReflectionsFromPackages } from "./get-declaration-reflections-from-packages.js";
import { getTypesFromPlatformSpecificUpscalerFiles } from "./get-types-from-platform-specific-upscaler-files.js";

vi.mock('./get-declaration-reflections-from-packages.js'), () => ({
  getDeclarationReflectionsFromPackages: vi.fn(),
});

vi.mock('./get-types-from-platform-specific-upscaler-files.js'), () => ({
  getTypesFromPlatformSpecificUpscalerFiles: vi.fn(),
})

describe('getAllDeclarationReflections()', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('gets merged declaration reflections', async () => {
    vi.mocked(getDeclarationReflectionsFromPackages).mockImplementation(() => {
      return [
        'foo',
      ] as any;
    });

    vi.mocked(getTypesFromPlatformSpecificUpscalerFiles).mockImplementation(() => {
      return [
        'bar',
      ] as any;
    });
    
    const results = await getAllDeclarationReflections();
    expect(results).toEqual(['foo', 'bar']);

  });
});
