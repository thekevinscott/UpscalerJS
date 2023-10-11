import { getPackageJSONExports } from './package-json.js';
import { vi } from 'vitest';
import * as _fs from './fs.js';
import { readFile } from './fs.js';

vi.mock('./fs.js', async () => {
  const actual = await vi.importActual("./fs.js") as typeof _fs;
  return {
    ...actual,
    readFile: vi.fn(),
  }
});

describe('package-json', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPackageJSONExports', () => {
    it('gets exports field from a package json for a single string exports', async () => {
      const mockReadFile = () => Promise.resolve(JSON.stringify({
        "exports": {
          ".": 'foobar',
        },
      }));

      vi.mocked(readFile).mockImplementation(mockReadFile as unknown as typeof readFile);

      expect(await getPackageJSONExports('foo')).toEqual([['.', 'foobar']])
    });

    it('gets exports field from a package json for a single nested exports', async () => {
      const mockReadFile = () => Promise.resolve(JSON.stringify({
        "exports": {
          ".": {
            "require": "./dist/cjs/models/esrgan-thick/src/index.js",
            "import": "./dist/esm/models/esrgan-thick/src/index.js"
          }
        },
      }));

      vi.mocked(readFile).mockImplementation(mockReadFile as unknown as typeof readFile);

      expect(await getPackageJSONExports('foo')).toEqual([['.', {
        "require": "./dist/cjs/models/esrgan-thick/src/index.js",
        "import": "./dist/esm/models/esrgan-thick/src/index.js"
      }]])
    });

    it('gets exports field from a package json for a multiple nested exports', async () => {
      const mockReadFile = () => Promise.resolve(JSON.stringify({
        "exports": {
          "./2x": {
            "require": "./dist/cjs/models/esrgan-thick/src/x2.js",
            "import": "./dist/esm/models/esrgan-thick/src/x2.js"
          },
          ".": {
            "require": "./dist/cjs/models/esrgan-thick/src/index.js",
            "import": "./dist/esm/models/esrgan-thick/src/index.js"
          }
        },
      }));

      vi.mocked(readFile).mockImplementation(mockReadFile as unknown as typeof readFile);

      expect(await getPackageJSONExports('foo')).toEqual([
        ['./2x', {
          "require": "./dist/cjs/models/esrgan-thick/src/x2.js",
          "import": "./dist/esm/models/esrgan-thick/src/x2.js"
        }],
        ['.', {
          "require": "./dist/cjs/models/esrgan-thick/src/index.js",
          "import": "./dist/esm/models/esrgan-thick/src/index.js"
        }],
      ]);
    });

    it('throws if given a bad exports field', async () => {
      const mockReadFile = () => Promise.resolve(JSON.stringify({
        "exports": 'foo',
      }));

      vi.mocked(readFile).mockImplementation(mockReadFile as unknown as typeof readFile);

      await expect(() => getPackageJSONExports('foo')).rejects.toThrow();
    });
  });
});
