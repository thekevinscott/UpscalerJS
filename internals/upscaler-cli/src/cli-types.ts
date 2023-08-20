import { Command } from "commander";

export type RegisterCommand = (program: Command) => void;
type Funct = (...args: unknown[]) => unknown;
export const isFunction = (command: unknown): command is Funct => typeof command === 'function';
