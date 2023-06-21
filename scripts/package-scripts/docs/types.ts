import yargs from 'yargs';

export interface SharedArgs {
  shouldClearMarkdown?: boolean;
}

export const getSharedArgs = async (): Promise<SharedArgs> => {
  const argv = await yargs(process.argv.slice(2)).options({
    shouldClearMarkdown: { type: 'boolean' },
  }).argv;

  return {
    ...argv,
  }
};
