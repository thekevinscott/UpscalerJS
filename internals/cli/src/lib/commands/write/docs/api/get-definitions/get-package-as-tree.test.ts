import * as typedoc from 'typedoc';
import { vi } from 'vitest';
import { getPackageAsTree } from './get-package-as-tree.js';

vi.mock('typedoc', async () => {
  const actual = await await vi.importActual('typedoc') as typeof typedoc;
  return {
    ...actual,
    Application: vi.fn().mockImplementation(() => ({
      options: {
        addReader: vi.fn(),
      },
      bootstrap: vi.fn(),
      convert: vi.fn(),
      serializer: {
        projectToObject: vi.fn(),
      },
    })), 
    TSConfigReader: vi.fn(), 
    TypeDocReader: vi.fn(),
  }
});

describe('getPackageAsTree', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('throws if project is not converted', async () => {
    vi.mocked(typedoc.Application).mockImplementation(() => {
      return {
        options: {
          addReader: vi.fn(),
        },
        bootstrap: vi.fn(),
        convert: vi.fn(),
      } as unknown as typedoc.Application;
    });
    await expect(async () => {
      await getPackageAsTree('entryPoint', 'tsconfig', 'projectRoot')
    }).rejects.toThrow();
  });

  it('returns project if it is converted', async () => {
    const projectToObject = vi.fn().mockImplementation(() => 'projectToObject');
    vi.mocked(typedoc.Application).mockImplementation(() => {
      return {
        options: {
          addReader: vi.fn(),
        },
        bootstrap: vi.fn(),
        convert: vi.fn().mockImplementation(() => 'foo'),
        serializer: {
          projectToObject,
        }
      } as unknown as typedoc.Application;
    });
    const result = await getPackageAsTree('entryPoint', 'tsconfig', 'projectRoot');
    expect(result).toEqual('projectToObject');
    expect(projectToObject).toHaveBeenCalledWith('foo', 'projectRoot');
  });
});
