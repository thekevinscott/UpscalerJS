import * as _fs from './fs.js';
import { exists, mkdirp } from './fs.js';
import { vi } from 'vitest';
import { rimraf } from 'rimraf';
import { makeTmpDir, withTmpDir } from "./tmp-dir.js";

vi.mock("./fs.js", async () => {
  const actual = await vi.importActual("./fs.js") as typeof _fs;
  return {
    ...actual,
    exists: vi.fn(),
    mkdirp: vi.fn(),
  };
});

vi.mock('rimraf', async () => {
  const actual = await vi.importActual("rimraf") as typeof rimraf;
  return {
    ...actual,
    rimraf: vi.fn(),
  };
});

describe('makeTmpDir', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('makes a random folder and returns it', async () => {
    vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
    const folder = await makeTmpDir();
    expect(typeof folder).toBe('string');
    expect(mkdirp).toHaveBeenCalledWith(folder);
    expect(exists).toHaveBeenCalledWith(folder);
  });

  it('makes a random folder at a given directory', async () => {
    vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
    const folder = await makeTmpDir('foobarbaz');
    expect(folder).toContain('foobarbaz')
  });

  it('throws if folder was not created', async () => {
    vi.mocked(exists).mockImplementation(() => Promise.resolve(false));
    await expect(() => makeTmpDir()).rejects.toThrow();
  });
});

describe('withTmpDir', () => {
  beforeEach(() => {
    vi.mocked(exists).mockImplementation(() => Promise.resolve(true));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('makes a tmp dir and calls a callback in it', async () => {
    const callback = vi.fn();
    await withTmpDir(callback);
    expect(callback).toHaveBeenCalledWith(expect.any(String));
  });

  it('returns the response of callback', async () => {
    const callback = vi.fn().mockResolvedValue('foo');
    const response = await withTmpDir(callback);
    expect(response).toBe('foo');
  });

  it('removes tmp directory by default', async () => {
    expect(rimraf).not.toHaveBeenCalled();
    await withTmpDir(vi.fn());
    expect(rimraf).toHaveBeenCalled();
  });

  it('if it fails to remove tmp directory, console.error', async () => {
    console.error = vi.fn();
    expect(console.error).not.toHaveBeenCalled();
    vi.mocked(rimraf).mockImplementation(() => {
      throw new Error('WHOA')
    });

    await withTmpDir(vi.fn());
    expect(console.error).toHaveBeenCalled();
  });

  it('does not remove tmp directory if specified not to', async () => {
    await withTmpDir(vi.fn(), {
      removeTmpDir: false,
    });
    expect(rimraf).not.toHaveBeenCalled();
  });

  it('passes root dir if specified', async () => {
    expect(rimraf).not.toHaveBeenCalled();
    await withTmpDir(vi.fn(), {
      rootDir: 'foobarbaz',
    });
    expect(rimraf).toHaveBeenCalledWith(expect.stringContaining('foobarbaz'));
  });
});
