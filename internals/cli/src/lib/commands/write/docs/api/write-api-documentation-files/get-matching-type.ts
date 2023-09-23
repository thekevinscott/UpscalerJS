import { DeclarationReflection, ParameterReflection, TypeParameterReflection } from "typedoc";
import { DecRef, Definitions, isLiteralType, isPlatformSpecificFileDeclarationReflection, isUnionType } from "../types.js";
import { EXTERNALLY_DEFINED_TYPES, INTRINSIC_TYPES } from "../constants.js";
import { warn } from "@internals/common/logger";
import { getReferenceTypeOfParameter } from "./get-reference-type-of-parameter.js";

/**
 * getMatchingType returns the matching type for a given parameter.
 * 
 * It looks through the definitions tree, along with externally defined types
 */

export const getMatchingType = (
  parameter: ParameterReflection | DeclarationReflection,
  definitions: Definitions,
  typeParameters: Record<string, TypeParameterReflection> = {}
): undefined | DecRef => {
  const { classes, interfaces, types } = definitions;
  let { name: nameOfTypeDefinition } = getReferenceTypeOfParameter(parameter.type, definitions);
  if (INTRINSIC_TYPES.includes(nameOfTypeDefinition)) {
    return undefined;
  }
  if (parameter.type === undefined) {
    return undefined;
  }
  if (isLiteralType(parameter.type)) {
    return undefined;
  }
  // first, check if it is a specially defined external type
  const externallyDefinedType = EXTERNALLY_DEFINED_TYPES[nameOfTypeDefinition] || interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
  if (externallyDefinedType) {
    return externallyDefinedType;
  }

  // it's possible that this type is a generic type; in which case, replace the generic with the actual type it's extending
  // this is _UGLY_
  const typeParameterType = typeParameters[nameOfTypeDefinition];
  if (typeParameterType && typeParameterType.type !== undefined && 'name' in typeParameterType.type) {
    nameOfTypeDefinition = typeParameterType.type.name;
    const matchingType = interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
    parameter.type = isPlatformSpecificFileDeclarationReflection(matchingType) ? matchingType.declarationReflection.type : matchingType.type;
    return matchingType;
  }
  if (!isUnionType(parameter.type)) {
    let matchingDefKey: string | undefined;
    for (const [definitionKey, defs] of Object.entries(definitions)) {
      for (const key of Object.keys(defs)) {
        if (key === nameOfTypeDefinition) {
          matchingDefKey = definitionKey;
        }
      }
    }
    warn([
      `No matching type could be found for ${nameOfTypeDefinition} in interfaces, types, or classes.`,
      matchingDefKey ? `However, it was found in ${matchingDefKey}.` : undefined,
      `- Available interfaces: ${Object.keys(interfaces).join(', ')}`,
      `- Available types: ${Object.keys(types).join(', ')}`,
      `- Available classes: ${Object.keys(classes).join(', ')}`,
      'Parameter type:',
      JSON.stringify(parameter.type),
    ].join('\n'));
  }
  return undefined;
};
