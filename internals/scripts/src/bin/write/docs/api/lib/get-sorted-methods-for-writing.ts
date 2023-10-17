import { DeclarationReflection } from "typedoc";
import { DecRef, Definitions, isPlatformSpecificFileDeclarationReflection } from "./types.js";
import { VALID_EXPORTS_FOR_WRITING_DOCS, VALID_METHODS_FOR_WRITING_DOCS } from "./constants.js";
import { info } from "@internals/common/logger";
import { sortChildrenByLineNumber } from "./sort-children-by-line-number.js";

const getDecRef = (decRef: DecRef) => isPlatformSpecificFileDeclarationReflection(decRef) ? decRef.declarationReflection : decRef;

export const getSortedMethodsForWriting = (definitions: Definitions): DeclarationReflection[] => {
  const decRefs = Object.values(definitions.classes);
  const methods: DeclarationReflection[] = [];
  for (const { name, children = [] } of decRefs.map(getDecRef)) {
    if (VALID_EXPORTS_FOR_WRITING_DOCS.includes(name)) {
      sortChildrenByLineNumber(children).forEach(method => {
        if (VALID_METHODS_FOR_WRITING_DOCS.includes(method.name)) {
          methods.push(method);
        } else {
          info(`** Ignoring method ${method.name}`);
        }
      });
    }
  }
  return methods;
};
