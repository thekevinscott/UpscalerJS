import { DeclarationReflection } from "typedoc";
import { Definitions } from "../types.js";
import { getReferenceTypeOfParameter } from "./get-reference-type-of-parameter.js";
import { getURLFromSources } from "./get-url-from-sources.js";
import { getSummary } from "./write-parameter.js";

export const writePlatformSpecificParameter = (platform: string, parameter: DeclarationReflection, definitions: Definitions) => {
  const comment = getSummary(parameter.comment);
  const { type, name } = getReferenceTypeOfParameter(parameter.type, definitions);
  const url = getURLFromSources(parameter);
  const parsedName = `${name}${type === 'array' ? '[]' : ''}`;
  return [
    '-',
    `**[${platform}](${url})**:`,
    `\`${parsedName}\``,
    comment ? ` - ${comment}` : undefined,
  ].filter(Boolean).join(' ');
};
