import { vi } from 'vitest';
import fsExtra from "fs-extra";
import { TFJS_LIBRARY_TARGET_ERROR, getTFJSLibraryTargetFromPackageJSON } from './tfjs-library';
const { readFile } = fsExtra;

vi.mock('fs-extra', () => {
  return {
    default: {
      readFile: vi.fn(),
    },
  }
});

describe('getTFJSLibraryTarget', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const makeMock = (dependencies: Record<string, string>) => {
    vi.mocked(readFile).mockImplementation(() => Promise.resolve(Buffer.from(JSON.stringify({
      dependencies,
    }))));
  }

  it('loads the correct package json from the right directory', async () => {
    makeMock({
      '@tensorflow/tfjs': '1.0.0',
    });
    expect(readFile).toHaveBeenCalledTimes(0);
    expect(await getTFJSLibraryTargetFromPackageJSON('foo')).toBe('browser');
    expect(readFile).toHaveBeenCalledWith(expect.stringContaining('foo/package.json'), expect.anything());
  });

  it('returns browser for @tensorflow/tfjs', async () => {
    makeMock({
      '@tensorflow/tfjs': '1.0.0',
    });
    expect(await getTFJSLibraryTargetFromPackageJSON('foo')).toBe('browser');
  });

  it('returns node for @tensorflow/tfjs-node', async () => {
    makeMock({
      '@tensorflow/tfjs-node': '1.0.0',
    });
    expect(await getTFJSLibraryTargetFromPackageJSON('foo')).toBe('node');
  });

  it('returns node-gpu for @tensorflow/tfjs-node-gpu', async () => {
    makeMock({
      '@tensorflow/tfjs-node-gpu': '1.0.0',
    });
    expect(await getTFJSLibraryTargetFromPackageJSON('foo')).toBe('node-gpu');
  });

  it('throws if no dependencies are found', async () => {
    makeMock({
    });
    await expect(() => getTFJSLibraryTargetFromPackageJSON('foo')).rejects.toThrow(TFJS_LIBRARY_TARGET_ERROR('foo'));
  });
});
