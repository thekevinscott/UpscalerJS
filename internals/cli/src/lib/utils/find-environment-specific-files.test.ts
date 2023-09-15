import { vi } from 'vitest';
import fsExtra from "fs-extra";
import { findEnvironmentSpecificFiles } from './find-environment-specific-files.js';
const { readdir } = fsExtra;

vi.mock('fs-extra', () => {
  return {
    default: {
      readdir: vi.fn(),
    },
  }
});

describe("findEnvironmentSpecificFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('finds only platform specific files', async () => {
    const mockReadDir = () => Promise.resolve([
      'foo.ts',
      'foo.browser.ts',
      'foo.node.ts',
      'bar.ts',
      'random.ts',
      'image.browser.js',
      'image.node.js',
      'node.ts',
      'browser.ts',
    ]);

    vi.mocked(readdir).mockImplementation(mockReadDir as unknown as typeof readdir);

    expect(await findEnvironmentSpecificFiles('')).toEqual([
      'foo.browser.ts',
      'foo.node.ts',
      'image.browser.js',
      'image.node.js',
    ]);
  });
});

