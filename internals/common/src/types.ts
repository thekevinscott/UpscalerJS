import { TFJSLibrary } from "./tfjs-library.js";

export type OutputFormat = 'cjs' | 'esm' | 'umd';
export type Environment = 'serverside' | 'clientside';

export const isTFJSLibrary = (platform: unknown): platform is TFJSLibrary => typeof platform === 'string' && ['node', 'node-gpu', 'browser'].includes(platform);
export const isOutputFormat = (outputFormat: unknown): outputFormat is OutputFormat => typeof outputFormat === 'string' && ['cjs', 'esm', 'umd'].includes(outputFormat);
export const isEnvironment = (environment: unknown): environment is Environment => typeof environment === 'string' && ['serverside', 'clientside'].includes(environment);

export type Action<T extends unknown[]> = (...args: T) => Promise<void>;

export { TFJSLibrary } from './tfjs-library.js';
