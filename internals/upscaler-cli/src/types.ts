import { Command } from "commander";

export type RegisterCommand = (program: Command) => void;
export const isFunction = (command: unknown): command is Function => typeof command === 'function';
