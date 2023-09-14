import { writeFile } from "@internals/common/fs";
import { getTemplate } from "@internals/common/get-template";
import path from "path";
import { DeclarationReflection } from "typedoc";
import { TEMPLATES_DIR } from "./constants.js";

export const writeIndexFile = async (dest: string, methods: DeclarationReflection[]) => {
  const contents = await getTemplate(path.resolve(TEMPLATES_DIR, 'index.md.t'), {
    methods,
  });
  await writeFile(path.resolve(dest, 'index.md'), contents);
}
