import * as typedoc from 'typedoc';
import { vi } from 'vitest';
import { getPackageAsTree } from './get-package-as-tree.js';

vi.mock('typedoc', async () => {
  const actual = await vi.importActual('typedoc') as typeof typedoc;
  return {
    ...actual,
    Application: {
      bootstrap: vi.fn(),
    },
    TSConfigReader: vi.fn(),
    TypeDocReader: vi.fn(),
  }
});

const mockApplication = (app: Partial<typedoc.Application>) => {
  vi.mocked(typedoc.Application.bootstrap).mockImplementation(async () => app as typedoc.Application);
};

describe('getPackageAsTree', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('throws if project is not converted', async () => {
    mockApplication({
      convert: vi.fn(),
    });
    await expect(async () => {
      await getPackageAsTree('entryPoint', 'tsconfig', 'projectRoot')
    }).rejects.toThrow();
  });

  it('returns project if it is converted', async () => {
    const projectToObject = vi.fn().mockImplementation(() => 'projectToObject');
    mockApplication({
      convert: vi.fn().mockImplementation(() => 'foo'),
      serializer: {
        projectToObject,
      } as unknown as typedoc.Serializer,
    });
    const result = await getPackageAsTree('entryPoint', 'tsconfig', 'projectRoot');
    expect(result).toEqual('projectToObject');
    expect(projectToObject).toHaveBeenCalledWith('foo', 'projectRoot');
  });
});
