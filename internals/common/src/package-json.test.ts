import { getPackageJSONExports } from './package-json.js';
import { vi } from 'vitest';
import * as fs from '@internals/common/fs';

const { readFile } = fs;

vi.mock('@internals/common/fs', async () => {
  const actual = await await vi.importActual("@internals/common/fs") as typeof fs;
  return {
    default: {
      ...actual,
      // exists: vi.fn(),
      // readdir: vi.fn().mockImplementation(() => Promise.resolve([])),
      readFile: vi.fn(),
      // stat: vi.fn(),
    },
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
            "require": "./dist/cjs/models/esrgan-thick/src/2x.js",
            "import": "./dist/esm/models/esrgan-thick/src/2x.js"
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
          "require": "./dist/cjs/models/esrgan-thick/src/2x.js",
          "import": "./dist/esm/models/esrgan-thick/src/2x.js"
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
