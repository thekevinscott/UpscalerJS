import { DeclarationReflection } from "typedoc";
import { writeIndexFile } from "./write-index-file.js";
import { getTemplate } from "@internals/common/get-template";
import { writeFile } from "@internals/common/fs";

vi.mock('@internals/common/fs', () => ({
  writeFile: vi.fn(),
}));

vi.mock('@internals/common/get-template', () => ({
  getTemplate: vi.fn(),
}));

describe('writeIndexFile', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('writes an index file', async () => {
    vi.mocked(getTemplate).mockResolvedValue('foobarbaz');
    await writeIndexFile('/out', [{
      name: 'foo',
    }] as unknown as DeclarationReflection[]);
    expect(getTemplate).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith('/out/index.md', 'foobarbaz');
  });
});
