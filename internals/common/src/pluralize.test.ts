import { DEFAULT_SEPARATOR, EMPTY_ITEMS_ERROR, pluralize } from "./pluralize.js";

describe("pluralize", () => {
  it('throws if given no items', () => {
    expect(() => pluralize([])).toThrow(EMPTY_ITEMS_ERROR);
  });

  it('returns a single item', () => {
    expect(pluralize(['foo'])).toEqual('foo');
  });

  it('returns two items with a separator', () => {
    expect(pluralize(['foo', 'bar'])).toEqual(`foo ${DEFAULT_SEPARATOR} bar`);
  });

  it('returns three items with commas and a separator', () => {
    expect(pluralize(['foo', 'bar', 'baz'])).toEqual(`foo, bar, ${DEFAULT_SEPARATOR} baz`);
  });

  it('accepts a custom separator', () => {
    expect(pluralize(['foo', 'bar', 'baz'], 'and')).toEqual('foo, bar, and baz');
  });
});
