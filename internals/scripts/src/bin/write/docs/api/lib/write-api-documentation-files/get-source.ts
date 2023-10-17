import { SourceReference } from "typedoc";
import { REPO_ROOT, TEMPLATES_DIR } from "../constants.js";
import { getTemplate } from "@internals/common/get-template";
import { rewriteURL } from "./get-url-from-sources.js";
import path from "path";

export const getSource = ([source]: SourceReference[]) => {
  let {
    fileName,
    line,
    url,
  } = source;
  url = `${REPO_ROOT}/blob/main/${fileName}#L${line}`;
  const prettyFileName = fileName.split('packages/upscalerjs/src/').pop();
  return getTemplate(path.resolve(TEMPLATES_DIR, 'source.md.t'), {
    prettyFileName,
    line,
    url: rewriteURL(url),
  });
};
