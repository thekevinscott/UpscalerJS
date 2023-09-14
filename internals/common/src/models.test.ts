import { vi } from 'vitest';
import * as fs from '@internals/common/fs';
import { EXCLUDED, getAllAvailableModelPackages, getAllAvailableModels, getSupportedPlatforms } from './models.js';
import { getPackageJSON, getPackageJSONExports, } from './package-json.js';

const { readFile, readdir, exists, stat } = fs;

vi.mock('@internals/common/fs', async () => {
  const actual = await vi.importActual("@internals/common/fs") as typeof fs;
  return {
    default: {
      ...actual,
      exists: vi.fn(),
      readdir: vi.fn().mockImplementation(() => Promise.resolve([])),
      readFile: vi.fn(),
      stat: vi.fn(),
    },
  }
});

vi.mock('./package-json.js', () => {
  // const actual = await vi.importActual("./package-json.js") as typeof fsExtra;
  return {
    getPackageJSONExports: vi.fn(),
    getPackageJSON: vi.fn(),
  }
});

describe('models', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getAllAvailableModelPackages', () => {
    it('throws if no models are returned', async () => {
      vi.mocked(readdir).mockImplementation(() => Promise.resolve([ ]));
      await expect(() => getAllAvailableModelPackages()).rejects.toThrow();
    });

    it('gets all available model packages', async () => {
      vi.mocked(readdir).mockImplementation(() => Promise.resolve([
        'foo',
        'bar',
        'baz',
      ]));

      vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(readFile).mockImplementation(() => Promise.resolve('{}'));
      vi.mocked(stat).mockImplementation(() => Promise.resolve({
        isDirectory: () => {
          return true;
        },
      }));

      expect(await getAllAvailableModelPackages()).toEqual(['foo', 'bar', 'baz']);
    });

    it('ignores any excluded folders', async () => {
      vi.mocked(readdir).mockImplementation(() => Promise.resolve([
        'foo',
        'bar',
        'baz',
        EXCLUDED[0],
      ]));

      vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(readFile).mockImplementation(() => Promise.resolve('{}'));
      vi.mocked(stat).mockImplementation(() => Promise.resolve({
        isDirectory: () => {
          return true;
        },
      }));

      expect(await getAllAvailableModelPackages()).toEqual(['foo', 'bar', 'baz']);
    });

    it('ignores any non directories', async () => {
      vi.mocked(readdir).mockImplementation(() => Promise.resolve([
        'foo',
        'bar',
        'baz',
        'file.ts',
      ]));

      vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(readFile).mockImplementation(() => Promise.resolve('{}'));
      const mockedStat = (name: string) => Promise.resolve({
        isDirectory: () => {
          return name.split('.').length === 1;
        },
      });
      vi.mocked(stat).mockImplementation(mockedStat as unknown as typeof stat);

      expect(await getAllAvailableModelPackages()).toEqual(['foo', 'bar', 'baz']);
    });

    it('ignores any models missing a package.json', async () => {
      vi.mocked(readdir).mockImplementation(() => Promise.resolve([
        'foo',
        'bar',
        'baz',
        'missing-package-json'
      ]));

      const mockExists = (packageJSONPath: string) => !packageJSONPath.includes('missing-package-json');

      vi.mocked(exists).mockImplementation(mockExists as unknown as typeof exists);
      vi.mocked(readFile).mockImplementation(() => Promise.resolve('{}'));
      vi.mocked(stat).mockImplementation(() => Promise.resolve({
        isDirectory: () => true,
      }));

      expect(await getAllAvailableModelPackages()).toEqual(['foo', 'bar', 'baz']);
    });

    it('ignores any models that are experimental by default', async () => {
      vi.mocked(readdir).mockImplementation(() => Promise.resolve([
        'foo',
        'bar',
        'baz',
        'experimental-package'
      ]));

      const mockReadFile = (packageJSONPath: string) => {
        if (packageJSONPath.includes('experimental-package')) {
          return Promise.resolve(JSON.stringify({
            '@upscalerjs': {
              model: {
                experimental: true,
              }
            },
          }));
        }
        return Promise.resolve('{}');
      };

      vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(readFile).mockImplementation(mockReadFile as unknown as typeof readFile);
      vi.mocked(stat).mockImplementation(() => Promise.resolve({
        isDirectory: () => true,
      }));

      expect(await getAllAvailableModelPackages()).toEqual(['foo', 'bar', 'baz']);
    });

    it('includes any models that are experimental if specified', async () => {
      vi.mocked(readdir).mockImplementation(() => Promise.resolve([
        'foo',
        'bar',
        'baz',
        'experimental-package'
      ]));

      const mockReadFile = (packageJSONPath: string) => {
        if (packageJSONPath.includes('experimental-package')) {
          return Promise.resolve(JSON.stringify({
            '@upscalerjs': {
              model: {
                experimental: true,
              }
            },
          }));
        }
        return Promise.resolve('{}');
      };

      vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(readFile).mockImplementation(mockReadFile as unknown as typeof readFile);
      vi.mocked(stat).mockImplementation(() => Promise.resolve({
        isDirectory: () => true,
      }));

      expect(await getAllAvailableModelPackages(true)).toEqual(['foo', 'bar', 'baz', 'experimental-package']);
    });
  });

  describe('getAllAvailableModels', () => {
    it('throws if given an exports field that does not match given UMD names', async () => {
      const mockReadFile = () => Promise.resolve(JSON.stringify({
      }));

      const mockedGetPackageJSONExports = () => Promise.resolve([
        ['./2x', '2x'],
        ['./3x', '3x'],
      ]);

      vi.mocked(readFile).mockImplementation(mockReadFile as unknown as typeof readFile);
      vi.mocked(getPackageJSONExports).mockImplementation(mockedGetPackageJSONExports as unknown as typeof getPackageJSONExports);
      await expect(() => getAllAvailableModels('foo')).rejects.toThrow();
    });

    it('gets all available models', async () => {
      const mockReadFile = () => Promise.resolve(JSON.stringify({
        "./2x": "Foo2x",
        "./3x": "Foo3x",
      }));

      const mockedGetPackageJSONExports = () => Promise.resolve([
        ['./2x', '2x'],
        ['./3x', '3x'],
      ]);

      vi.mocked(readFile).mockImplementation(mockReadFile as unknown as typeof readFile);
      vi.mocked(getPackageJSONExports).mockImplementation(mockedGetPackageJSONExports as unknown as typeof getPackageJSONExports);
      expect(await getAllAvailableModels('foo')).toEqual([
        {
          key: './2x',
          umdName: 'Foo2x',
          value: '2x',
        },
        {
          key: './3x',
          umdName: 'Foo3x',
          value: '3x',
        },
      ]);
    });
  });

  describe('getSupportedPlatforms', () => {
    it('gets browser and node by default', async () => {
      const mockedGetPackageJSON = () => Promise.resolve({});

      vi.mocked(getPackageJSON).mockImplementation(mockedGetPackageJSON as unknown as typeof getPackageJSON);
      expect(await getSupportedPlatforms('foo', 'bar')).toEqual(['browser', 'node']);
    });

    it('returns supported platforms if available', async () => {
      const mockedGetPackageJSON = () => Promise.resolve({
        '@upscalerjs': {
          models: {
            bar: {
              supportedPlatforms: [
                'node',
              ],
            },
          },
        },
      });

      vi.mocked(getPackageJSON).mockImplementation(mockedGetPackageJSON as unknown as typeof getPackageJSON);
      expect(await getSupportedPlatforms('foo', 'bar')).toEqual(['node']);
    });
  });
});
