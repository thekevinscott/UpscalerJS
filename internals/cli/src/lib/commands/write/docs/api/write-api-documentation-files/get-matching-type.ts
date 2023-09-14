import { DeclarationReflection, ParameterReflection, TypeParameterReflection } from "typedoc";
import { Definitions } from "../types.js";

export const getMatchingType = (
  parameter: ParameterReflection | DeclarationReflection,
  definitions: Definitions,
  typeParameters: Record<string, TypeParameterReflection> = {}
) => {
  const { classes, interfaces, types } = definitions;
  let { name: nameOfTypeDefinition } = getReferenceTypeOfParameter(parameter.type, definitions);
  let matchingType: undefined | PlatformSpecificDeclarationReflection | DeclarationReflection | TypeParameterReflection;
  if (!INTRINSIC_TYPES.includes(nameOfTypeDefinition) && parameter.type !== undefined && !isLiteralType(parameter.type)) {
    // first, check if it is a specially defined external type
    matchingType = EXTERNALLY_DEFINED_TYPES[nameOfTypeDefinition] || interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
    // console.log('matchingType', matchingType);
    if (!matchingType) {
      // it's possible that this type is a generic type; in which case, replace the generic with the actual type it's extending
      matchingType = typeParameters[nameOfTypeDefinition];
      if (matchingType) {
        nameOfTypeDefinition = (matchingType as any).type.name;
        matchingType = interfaces[nameOfTypeDefinition] || types[nameOfTypeDefinition];
        parameter.type = matchingType.type;
      }
    }
    if (!matchingType && (parameter.type === undefined || !isUnionType(parameter.type))) {
      console.warn('------')
      console.warn(parameter.type);
      console.warn([
        `No matching type could be found for ${nameOfTypeDefinition}.`,
        `- Available interfaces: ${Object.keys(interfaces).join(', ')}`,
        `- Available types: ${Object.keys(types).join(', ')}`,
        `- Available classes: ${Object.keys(classes).join(', ')}`
      ].join('\n'));
      console.warn('------')
    }
  }
  return matchingType;
};
