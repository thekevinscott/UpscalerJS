import { TypeParameterReflection } from "typedoc";
import { DecRef } from "../types.js";
import { REPO_ROOT } from "../constants.js";

export const rewriteURL = (url: string) => {
  const parts = url.split(/blob\/(?<group>[^/]+)/)
  if (parts.length !== 3) {
    throw new Error(`Error with the regex: ${url}`);
  }
  return [
    parts[0],
    'tree/main',
    parts[2],
  ].join('');
};

export const getURLFromSources = (matchingType: undefined | DecRef | TypeParameterReflection) => {
  if (!matchingType) {
    return undefined;
  }
  if ('sources' in matchingType) {
    const sources = matchingType.sources;
    if (sources?.length) {
      const { url } = sources[0];
      return url?.startsWith(REPO_ROOT) ? rewriteURL(url) : url;
    }
  }

  return undefined;
};
