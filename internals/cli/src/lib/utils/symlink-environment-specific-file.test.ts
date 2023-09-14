import path from 'path';
import { vi } from 'vitest';
import fsExtra from "fs-extra";
import { getFilePath, symlinkEnvironmentSpecificFile } from './symlink-environment-specific-file.js';
const { exists, unlink, symlink } = fsExtra;

vi.mock('fs-extra', () => {
  return {
    default: {
      exists: vi.fn(),
      unlink: vi.fn(),
      symlink: vi.fn(),
    },
  }
});

describe('getFilePath', () => {
  it('returns a browser file path', () => {
    expect(getFilePath('foo', 'browser')).toEqual('foo.browser.ts');
  });
  it('returns a node file path', () => {
    expect(getFilePath('foo', 'node')).toEqual('foo.node.ts');
  });
});

describe("symlinkEnvironmentSpecificFile", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('symlinks a particular file', async () => {
    vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
    vi.mocked(unlink).mockImplementation(() => Promise.resolve(true));
    vi.mocked(symlink).mockImplementation(() => Promise.resolve(true));

    expect(symlink).not.toHaveBeenCalled();
    await symlinkEnvironmentSpecificFile('some/folder', 'image.browser.ts', 'browser');
    expect(symlink).toHaveBeenCalledWith(path.resolve('some/folder', 'image.browser.ts'), path.resolve('some/folder', 'image.generated.ts'), 'file');
  });

  it('throws if the src file does not exist', async () => {
    vi.mocked(exists).mockImplementation(() => Promise.resolve(false));

    await expect(() => symlinkEnvironmentSpecificFile('some/folder', 'image.browser.ts', 'browser')).rejects.toThrowError(`File ${path.resolve('some/folder/image.browser.ts')} does not exist`);
  });
});
