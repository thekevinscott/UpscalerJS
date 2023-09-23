import { collectVariadicArgs } from "./collect-variadic-args.js";

const isString = (value?: unknown): value is string => Boolean(value) && typeof value === 'string';

export const collectStringArgs = (argv: string[]): string[] => collectVariadicArgs(argv).filter(isString);
