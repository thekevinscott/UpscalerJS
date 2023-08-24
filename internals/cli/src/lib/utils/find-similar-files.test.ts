import { findSimilarFiles } from './find-similar-files.js';

describe("findSimilarFiles", () => {
  it('finds similar files', () => {
    expect(findSimilarFiles(['foo', 'bar', 'baz'], 'ba')).toEqual(['bar', 'baz', 'foo']);
  });

  it('can limit to an n', () => {
    expect(findSimilarFiles(['foo', 'bar', 'baz'], 'ba', { n: 1 })).toEqual(['bar']);
  });

  it('can limit to a threshold distance', () => {
    expect(findSimilarFiles(['foo', 'bar', 'baz', 'baaa'], 'ba', { n: 3, distance: 2, })).toEqual(['bar', 'baz']);
  });

  it('sorts the files correctly', () => {
    expect(findSimilarFiles(['former', 'fogey', 'foo'], 'fo')).toEqual(['foo', 'fogey', 'former']);
  });
});
