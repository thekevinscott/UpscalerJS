export const collectVariadicArgs = (argv: string[]): unknown[] => {
  const _args: unknown[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('-')) {
      // skip this arg
      i += 1;
    } else {
      _args.push(arg);
    }
  }
  return _args;
};
