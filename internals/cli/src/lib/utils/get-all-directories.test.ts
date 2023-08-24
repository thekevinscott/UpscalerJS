import { vi } from 'vitest';
import fsExtra from "fs-extra";
import { getAllDirectories } from './get-all-directories.js';
const { readdir, stat } = fsExtra;

vi.mock('fs-extra', () => {
  return {
    default: {
      readdir: vi.fn(),
      stat: vi.fn(),
    },
  }
});

describe("getAllDirectories", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns only directories', async () => {
    const mockReadDir = () => Promise.resolve([
      'foo-dir',
      'bar-dir',
      'foo-non-dir',
      'bar-non-dir',
      'baz-dir',
      'baz-non-dir',
    ]);
    const mockStat = (name: string) => Promise.resolve({
      isDirectory: () => {
        return name.endsWith('non-dir') === false;
      },
    });

    vi.mocked(readdir).mockImplementation(mockReadDir as unknown as typeof readdir);
    vi.mocked(stat).mockImplementation(mockStat as unknown as typeof stat);

    expect(await getAllDirectories('foo')).toEqual([
      'foo-dir',
      'bar-dir',
      'baz-dir',
    ]);
  });
});
