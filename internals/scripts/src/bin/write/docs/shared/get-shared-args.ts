import { parseArgs } from "node:util";

export const getSharedArgs = () => {
  const {
    values: {
      ['should-clear-markdown']: shouldClearMarkdown = false,
    },
  } = parseArgs({
    options: {
      'should-clear-markdown': {
        type: "boolean",
        short: "c",
      },
    },
  });

  return { shouldClearMarkdown };
};
