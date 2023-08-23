import { buildCommandsTree } from "./build-commands-tree";
import { vi } from 'vitest';
import fsExtra from "fs-extra";
import { Command } from "commander";
// import fakeFileImport from 'foo/index.js';
const { readdir } = fsExtra;

vi.mock('fs-extra', () => {
  return {
    default: {
      readdir: vi.fn().mockImplementation(() => Promise.resolve([])),
      stat: vi.fn().mockImplementation((name) => Promise.resolve({
        isDirectory: () => {
          return (name as string).split('.').length === 1;
        },
      })),
    },
  }
});

vi.mock('foo/index.js', () => ({ default: vi.fn(), }));
vi.mock('foo/guide/index.js', () => ({ default: vi.fn(), }));
vi.mock('foo/guide/file1.ts', () => ({ default: vi.fn(), }));
vi.mock('foo/model/index.js', () => ({ default: vi.fn(), }));

describe('buildCommandsTree', () => {
  it('returns a single node for an empty directory, where that node is the directory', async () => {
    const mockReadDir = () => Promise.resolve([
    ]);

    vi.mocked(readdir).mockImplementation(mockReadDir);
    const node = await buildCommandsTree('foo');
    expect(Object.values(node.children).length).toBe(0);
  });

  it('returns a root node with one child for a directory with one file', async () => {
    const mockReadDir = () => Promise.resolve([
      'foo.json',
    ]);

    vi.mocked(readdir).mockImplementation(mockReadDir);
    const root = await buildCommandsTree('foo');
    expect(Object.values(root.children).length).toBe(1);
    const child = root.getChild('foo');
    expect(child.name).toBe('foo.json');
    expect(child.fullPath).toContain('foo/foo.json');
    expect(Object.values(child.children).length).toBe(0);
    expect(child.parent).toBe(root);
  });

  it('ignores a .DS_Store', async () => {
    const mockReadDir = () => Promise.resolve([
      'foo.json',
      '.DS_Store',
    ]);

    vi.mocked(readdir).mockImplementation(mockReadDir);
    const root = await buildCommandsTree('foo');
    expect(Object.values(root.children).length).toBe(1);
    const child = root.getChild('foo');
    expect(child.name).toBe('foo.json');
    expect(child.fullPath).toContain('foo/foo.json');
    expect(Object.values(child.children).length).toBe(0);
    expect(child.parent).toBe(root);
    expect(await child.isDirectory).toBe(false);
  });

  it('reads a directory as well', async () => {
    vi.mocked(readdir).mockImplementation((name) => {
      if (name === 'foo') {
        return Promise.resolve([
          'directory',
        ]);
      }
      return [];
    });
    const root = await buildCommandsTree('foo');
    expect(Object.values(root.children).length).toBe(1);
    const child = root.getChild('directory');
    expect(child.name).toBe('directory');
    expect(child.fullPath).toContain('foo/directory');
    expect(Object.values(child.children).length).toBe(0);
    expect(child.parent).toBe(root);
    expect(await child.isDirectory).toBe(true);
  });

  it('reads a directory and its contents', async () => {
    vi.mocked(readdir).mockImplementation((name) => {
      if (name === 'foo') {
        return Promise.resolve([
          'directory',
        ]);
      }
      return Promise.resolve([
        'file1.ts',
        'file2.ts',
      ]);
    });
    const root = await buildCommandsTree('foo');
    expect(Object.values(root.children).length).toBe(1);
    const directory = root.getChild('directory');
    expect(directory.name).toBe('directory');
    expect(directory.fullPath).toContain('foo/directory');
    expect(directory.parent).toBe(root);
    expect(await directory.isDirectory).toBe(true);

    expect(Object.values(directory.children).length).toBe(2);

    const file1 = directory.getChild('file1');
    expect(file1.name).toBe('file1.ts');
    expect(file1.fullPath).toContain('foo/directory/file1.ts');
    expect(file1.parent).toBe(directory);
    expect(await file1.isDirectory).toBe(false);
    expect(Object.values(file1.children).length).toBe(0);

    const file2 = directory.getChild('file2');
    expect(file2.name).toBe('file2.ts');
    expect(file2.fullPath).toContain('foo/directory/file2.ts');
    expect(file2.parent).toBe(directory);
    expect(await file2.isDirectory).toBe(false);
    expect(Object.values(file2.children).length).toBe(0);
  });

  it('reads a directory and its contents and _its_ contents', async () => {
    vi.mocked(readdir).mockImplementation((name) => {
      if (name.toString().endsWith('foo')) {
        return Promise.resolve([
          'directory',
          'rootFile.ts',
        ]);
      }
      if (name.toString().endsWith('directory')) {
        return Promise.resolve([
          'subdirectory1',
          'subdirectory2',
          'file1.ts',
          'file2.ts',
        ]);
      }
      if (name.toString().endsWith('subdirectory1')) {
        return Promise.resolve([
          'file3.ts',
        ]);
      }
      if (name.toString().endsWith('subdirectory2')) {
        return Promise.resolve([
          'file4.ts',
        ]);
      }
      throw new Error(`Unexpected directory: ${name}`);
    });
    const root = await buildCommandsTree('foo');
    expect(Object.values(root.children).length).toBe(2);

    const rootFile = root.getChild('rootFile');
    expect(rootFile.name).toBe('rootFile.ts');
    expect(rootFile.fullPath).toContain('foo/rootFile.ts');
    expect(rootFile.parent).toBe(root);
    expect(await rootFile.isDirectory).toBe(false);
    expect(Object.values(rootFile.children).length).toBe(0);

    const directory = root.getChild('directory');
    expect(directory.name).toBe('directory');
    expect(directory.fullPath).toContain('foo/directory');
    expect(directory.parent).toBe(root);
    expect(await directory.isDirectory).toBe(true);
    expect(Object.values(directory.children).length).toBe(4);

    const file1 = directory.getChild('file1');
    expect(file1.name).toBe('file1.ts');
    expect(file1.fullPath).toContain('foo/directory/file1.ts');
    expect(file1.parent).toBe(directory);
    expect(await file1.isDirectory).toBe(false);
    expect(Object.values(file1.children).length).toBe(0);

    const file2 = directory.getChild('file2');
    expect(file2.name).toBe('file2.ts');
    expect(file2.fullPath).toContain('foo/directory/file2.ts');
    expect(file2.parent).toBe(directory);
    expect(await file2.isDirectory).toBe(false);
    expect(Object.values(file2.children).length).toBe(0);

    const subdirectory1 = directory.getChild('subdirectory1');
    expect(subdirectory1.name).toBe('subdirectory1');
    expect(subdirectory1.fullPath).toContain('foo/directory/subdirectory1');
    expect(subdirectory1.parent).toBe(directory);
    expect(await subdirectory1.isDirectory).toBe(true);
    expect(Object.values(subdirectory1.children).length).toBe(1);

    const file3 = subdirectory1.getChild('file3');
    expect(file3.name).toBe('file3.ts');
    expect(file3.fullPath).toContain('foo/directory/subdirectory1/file3.ts');
    expect(file3.parent).toBe(subdirectory1);
    expect(await file3.isDirectory).toBe(false);
    expect(Object.values(file3.children).length).toBe(0);

    const subdirectory2 = directory.getChild('subdirectory2');
    expect(subdirectory2.name).toBe('subdirectory2');
    expect(subdirectory2.fullPath).toContain('foo/directory/subdirectory2');
    expect(subdirectory2.parent).toBe(directory);
    expect(await subdirectory2.isDirectory).toBe(true);
    expect(Object.values(subdirectory2.children).length).toBe(1);

    const file4 = subdirectory2.getChild('file4.ts');
    expect(file4.name).toBe('file4.ts');
    expect(file4.fullPath).toContain('foo/directory/subdirectory2/file4.ts');
    expect(file4.parent).toBe(subdirectory2);
    expect(await file4.isDirectory).toBe(false);
    expect(Object.values(file4.children).length).toBe(0);

  });

  const mockFakeFile = (pathname: string) => import(pathname);
  describe('commands', () => {

    it('a directory returns the command for its index file', async () => {
      const fakeFile = await mockFakeFile('foo/index.js');
      const mockReadDir = () => Promise.resolve([
        'index.js',
      ]);

      function registerFunction () { };
      fakeFile.default = registerFunction;

      vi.mocked(readdir).mockImplementation(mockReadDir);
      const root = await buildCommandsTree('foo');
      expect(await root.getRegistrationFunction()).toEqual(registerFunction);
    });

    it('a file returns the command for itself', async () => {
      const fakeFile = await mockFakeFile('foo/index.js');
      const mockReadDir = () => Promise.resolve([
        'index.js',
      ]);

      function registerFunction () { };
      fakeFile.default = registerFunction;

      vi.mocked(readdir).mockImplementation(mockReadDir);
      const root = await buildCommandsTree('foo');
      expect(await root.getChild('index').getRegistrationFunction()).toEqual(registerFunction);
    });
  });

  it('registers a program', async () => {
    const guideIndex = await mockFakeFile('foo/guide/index.js');
    const modelIndex = await mockFakeFile('foo/model/index.js');
    const guideFile1 = await mockFakeFile('foo/guide/file1.ts');
    guideIndex.default = (program: Command) => program.command('guide')
    modelIndex.default = (program: Command) => program.command('model')
    guideFile1.default = (program: Command) => program.command('file1')
    vi.mocked(readdir).mockImplementation((name) => {
      if (name.toString().endsWith('foo')) {
        return Promise.resolve([
          'guide',
          'model',
        ]);
      }
      if (name.toString().endsWith('guide')) {
        return Promise.resolve([
          'index.js',
          'file1.ts',
        ]);
      }
      if (name.toString().endsWith('model')) {
        return Promise.resolve([
          'index.js',
        ]);
      }
      throw new Error(`Unexpected directory: ${name}`);
    });
    const root = await buildCommandsTree('foo');
    const subFakePrograms: FakeProgram[] = [];
    class FakeProgram {
      command = vi.fn().mockImplementation(() => {
        const subFakeProgram = new FakeProgram();
        subFakePrograms.push(subFakeProgram);
        return subFakeProgram;
      });
    }
    const fakeProgram = new FakeProgram();
    await root.registerProgram(fakeProgram as unknown as Command);
    expect(fakeProgram.command).toHaveBeenCalledWith('guide');
    expect(fakeProgram.command).toHaveBeenCalledWith('model');
    expect(subFakePrograms.length).toBeGreaterThanOrEqual(2);
    expect(subFakePrograms[0].command).toHaveBeenCalledWith('file1');
  });
});
