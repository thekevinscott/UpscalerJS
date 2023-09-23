import { PlatformSpecificFileDeclarationReflection } from "../types.js";
import { getAllDeclarationReflections } from "./get-all-declaration-reflections.js";
import { getDeclarationReflectionsFromPackages } from "./get-declaration-reflections-from-packages.js";
import { getTypesFromPlatformSpecificUpscalerFiles } from "./get-types-from-platform-specific-upscaler-files.js";
import { DeclarationReflection } from "typedoc";

vi.mock('./get-declaration-reflections-from-packages.js', () => ({
  getDeclarationReflectionsFromPackages: vi.fn(),
}));

vi.mock('./get-types-from-platform-specific-upscaler-files.js', () => ({
  getTypesFromPlatformSpecificUpscalerFiles: vi.fn(),
}));

describe('getAllDeclarationReflections()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('gets merged declaration reflections', async () => {
    vi.mocked(getDeclarationReflectionsFromPackages).mockImplementation(() => {
      return [
        'foo',
      ] as unknown as DeclarationReflection[];
    });

    vi.mocked(getTypesFromPlatformSpecificUpscalerFiles).mockImplementation(() => {
      return Promise.resolve([
        'bar',
      ] as unknown as PlatformSpecificFileDeclarationReflection[]);
    });
    
    const results = await getAllDeclarationReflections();
    expect(results).toEqual(['foo', 'bar']);

  });
});
