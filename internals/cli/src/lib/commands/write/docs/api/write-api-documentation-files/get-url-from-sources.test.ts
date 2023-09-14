import { DeclarationReflection, SourceReference } from "typedoc";
import { DecRef } from "../types.js";
import { getURLFromSources, rewriteURL } from "./get-url-from-sources.js";
import { REPO_ROOT } from "../constants.js";

describe('rewriteURL', () => {
  it('rewrites the URL', () => {
    const URL = 'https://github.com/thekevinscott/UpscalerJS/blob/foobabaz/packages/upscalerjs/jest.setup.ts';
    expect(rewriteURL(URL)).toEqual([
      "https://github.com/thekevinscott/UpscalerJS/",
      "tree/main",
      "/packages/upscalerjs/jest.setup.ts",
    ].join(''));
  });

  it('throws if given a non-matching url', () => {
    const URL = 'https://github.com/thekevinscott/UpscalerJS/foobabaz/packages/upscalerjs/jest.setup.ts';
    expect(() => rewriteURL(URL)).toThrow();
  });
});

describe('getURLFromSources', () => {
  it('returns undefined if no matching type is provided', () => {
    expect(getURLFromSources(undefined)).toEqual(undefined);
  });

  it('returns undefined if sources is not available', () => {
    expect(getURLFromSources({} as DecRef)).toEqual(undefined);
  });

  it('returns undefined if sources is empty', () => {
    expect(getURLFromSources({
      sources: [] as SourceReference[],
    } as DeclarationReflection)).toEqual(undefined);
  });

  it('returns rewritten URL if beginning with repo root', () => {
    const url = 'https://github.com/thekevinscott/UpscalerJS/blob/foobabaz/packages/upscalerjs/jest.setup.ts';
    expect(getURLFromSources({
      sources: [{
        url,
      }] as SourceReference[],
    } as DecRef)).toEqual(rewriteURL(url));
  });

  it('returns unrewritten URL if not beginning with repo root', () => {
    const url = 'foo.com';
    expect(getURLFromSources({
      sources: [{
        url,
      }] as SourceReference[],
    } as DecRef)).toEqual(url);
  });
});
