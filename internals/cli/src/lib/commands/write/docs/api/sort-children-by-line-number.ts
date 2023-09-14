import { DeclarationReflection } from "typedoc";

export function sortChildrenByLineNumber(children: DeclarationReflection[]) {
  return children.sort(({ sources: aSrc }, { sources: bSrc }) => {
    if (!aSrc?.length) {
      return 1;
    }
    if (!bSrc?.length) {
      return -1;
    }
    return aSrc[0].line - bSrc[0].line;
  });
};
