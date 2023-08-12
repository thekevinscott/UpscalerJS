import yargs from 'yargs';

export interface SharedArgs {
  shouldClearMarkdown?: boolean;
  verbose?: boolean;
}

export const getSharedArgs = async (): Promise<SharedArgs> => {
  const argv = await yargs(process.argv.slice(2)).options({
    shouldClearMarkdown: { type: 'boolean' },
    verbose: { type: 'boolean' },
  }).argv;

  return {
    ...argv,
  }
};
