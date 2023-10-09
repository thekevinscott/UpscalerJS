import { readFile } from '@internals/common/fs';
import { compile } from 'ejs';

const parseValue = (value: unknown) => {
  if (value === undefined) {
    return 'undefined';
  }
  return value;
};

export const getTemplate = async (
  templatePath: string,
  args: Record<string, unknown> = {},
) => {
  try {
    return await compile(await readFile(templatePath))(Object.entries(args).reduce<Record<string, unknown>>((obj, [key, value]) => {
      return {
        ...obj,
        [key]: parseValue(value),
      };
    }, {}));
  } catch (e) {
    if (e instanceof Error) {
      console.error(`Error while compiling template ${templatePath} with args ${JSON.stringify(args, null, 2)}: ${e.message}`);
    }
    throw e;
  }
};

