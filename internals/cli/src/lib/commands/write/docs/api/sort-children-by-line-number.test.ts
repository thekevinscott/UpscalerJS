import { DeclarationReflection, SourceReference } from "typedoc";
import { sortChildrenByLineNumber } from "./sort-children-by-line-number.js";

const getMockDeclarationReflection = (...sources: Partial<SourceReference>[]): DeclarationReflection => {
  return {
    sources, 
  } as unknown as DeclarationReflection;
};

describe('sortChildrenByLineNumber', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sorts children', () => {
    const line1 = getMockDeclarationReflection({
      line: 1,
    });
    const line0 = getMockDeclarationReflection({
      line: 0,
    });
    const line2 = getMockDeclarationReflection({
      line: 2,
    });
    expect(sortChildrenByLineNumber([
      line1,
      line2,
      line0,
    ])).toEqual([line0, line1, line2]);
  });

  it('returns sources before no sources', () => {
    const linefoo = getMockDeclarationReflection();
    const linebar = getMockDeclarationReflection();
    const line2 = getMockDeclarationReflection({
      line: 2,
    });
    expect(sortChildrenByLineNumber([
      linefoo,
      line2,
      linebar,
    ])).toEqual([line2, linefoo, linebar]);
  });
});

