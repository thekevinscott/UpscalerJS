import { Comment } from "typedoc";
import { getTextSummary } from "./get-text-summary.js";

describe('getTextSummary', () => {
  it('returns an empty object for an undefined comment', () => {
    expect(getTextSummary('foo')).toEqual({});
  });

  it('throws an error if receiving an empty summary', () => {
    expect(() => getTextSummary('foo', {
      summary: [],
      blockTags: [],
    } as unknown as Comment)).toThrow(`Expected code snippet not found for foo`);
  });

  it('throws an error if receiving a summary with kind not code', () => {
    expect(() => getTextSummary('foo', {
      summary: [{
        kind: 'foo',
      }],
      blockTags: [],
    } as unknown as Comment)).toThrow(`Expected code snippet not found for foo`);
  });

  it('returns a text summary', () => {
    expect(getTextSummary('foo', {
      summary: [{
        kind: 'code',
        text: 'foo',
      }, {
        kind: 'code',
        text: 'bar',
      }],
      blockTags: [{
        tag: 'baz',
        content: 'qux',
      }],
    } as unknown as Comment)).toEqual({
      blockTags: {
        baz: 'qux',
      },
      description: 'foo',
      codeSnippet: 'bar',

    });
  });
});
