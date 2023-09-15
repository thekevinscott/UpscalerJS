import { writeAPIDocumentationFiles } from "./write-api-documentation-files.js";
import { mkdirp, writeFile } from "@internals/common/fs";
import { getContentForMethod } from './get-content-for-method.js';
import { Definitions } from "../types.js";
import { DeclarationReflection } from "typedoc";

vi.mock('@internals/common/fs', () => ({
  writeFile: vi.fn(),
  mkdirp: vi.fn(),
}));

vi.mock('./get-content-for-method.js', () => ({
  getContentForMethod: vi.fn(),
}));

describe('writeAPIDocumentationFiles', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('it to write API documentation files', async () => {
    vi.mocked(getContentForMethod).mockReturnValue('foobarbaz');
    await writeAPIDocumentationFiles('/out', [{
      name: 'foo'
    } as DeclarationReflection], {} as unknown as Definitions);
    expect(getContentForMethod).toHaveBeenCalled();
    expect(mkdirp).toHaveBeenCalledWith('/out');
    expect(writeFile).toHaveBeenCalledWith('/out/foo.md', 'foobarbaz');
  });

  it('it to write API documentation files for multiple methods', async () => {
    vi.mocked(getContentForMethod).mockReturnValue('foobarbaz');
    await writeAPIDocumentationFiles('/out', [{
      name: 'foo'
    }, {
      name: 'bar',
    }] as DeclarationReflection[], {} as unknown as Definitions);
    expect(getContentForMethod).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenCalledWith('/out/foo.md', 'foobarbaz');
    expect(writeFile).toHaveBeenCalledWith('/out/bar.md', 'foobarbaz');
  });

  it('it to throw if no content is returned', async () => {
    vi.mocked(getContentForMethod).mockReturnValue('');
    expect(() => writeAPIDocumentationFiles('/out', [{
      name: 'foo'
    }, {
      name: 'bar',
    }] as DeclarationReflection[], {} as unknown as Definitions)).rejects.toThrow();
  });
});
