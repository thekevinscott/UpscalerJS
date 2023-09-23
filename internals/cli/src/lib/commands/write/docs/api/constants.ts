import { CORE_DIR, UPSCALER_DIR } from "@internals/common/constants";
import path from 'path';
import { DeclarationReflection, ReflectionKind, TypeParameterReflection } from "typedoc";
import * as url from 'url';
import { Definitions } from "./types.js";
import { writePlatformSpecificDefinitions } from "./write-api-documentation-files/write-parameter.js";

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const REPO_ROOT = 'https://github.com/thekevinscott/UpscalerJS';
export const UPSCALER_TSCONFIG_PATH = path.resolve(UPSCALER_DIR, 'tsconfig.esm.json');
export const UPSCALER_SRC_PATH = path.resolve(UPSCALER_DIR, 'src');
export const CORE_TSCONFIG_PATH = path.resolve(CORE_DIR, 'tsconfig.json');
export const CORE_SRC_PATH = path.resolve(CORE_DIR, 'src');
export const VALID_EXPORTS_FOR_WRITING_DOCS = ['default'];
export const VALID_METHODS_FOR_WRITING_DOCS = [
  'constructor', 
  'upscale',
  'execute',
  'warmup',
  'abort',
  'dispose',
  'getModel',
];
export const INTRINSIC_TYPES = [
  'string',
  'number',
  'boolean',
];
export const TYPES_TO_EXPAND: Record<string, string[]> = {
  'upscale': ['Input', 'Progress'],
  'warmup': ['WarmupSizes'],
};
export const TEMPLATES_DIR = path.resolve(__dirname, '_templates');

export const makeNewExternalType = (name: string, _url: string): DeclarationReflection => {
  const type = new DeclarationReflection(name, ReflectionKind['SomeType']);
  type.sources = [];
  return type;
};

export const EXTERNALLY_DEFINED_TYPES: Record<string, DeclarationReflection> = {
  'AbortSignal': makeNewExternalType(
    'AbortSignal',
    'https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal'
  ),
  'SerializableConstructor': makeNewExternalType(
    'SerializableConstructor',
    'https://github.com/tensorflow/tfjs/blob/38f8462fe642011ff1b7bcbb52e018f3451be58b/tfjs-core/src/serialization.ts#L54',
  ),
}

export const EXPANDED_TYPE_CONTENT: Record<string, (definitions: Definitions, typeParameters: Record<string, TypeParameterReflection>) => string> = {
  'Input': (definitions) => writePlatformSpecificDefinitions(definitions),
  'WarmupSizes': () => ([
    '- `number` - a number representing both the size (width and height) of the patch.',
    '- `{patchSize: number; padding?: number}` - an object with the `patchSize` and optional `padding` properties.',
    '- `number[]` - an array of numbers representing the size (width and height) of the patch.',
    '- `{patchSize: number; padding?: number}[]` - an array of objects with the `patchSize` and optional `padding` properties.',
  ].join('\n')),
  'Progress': () => ([
    'The progress callback function has the following four parameters:',
    '- `progress` - a number between 0 and 1 representing the progress of the upscale.',
    '- `slice` - a string or 3D tensor representing the current slice of the image being processed. The type returned is specified by the `progressOutput` option, or if not present, the `output` option, or if not present, string for the browser and tensor for node.',
    '- `row` - the row of the image being processed.',
    '- `col` - the column of the image being processed.',
    '',
    '[See the guide on progress for more information.](/documentation/guides/browser/usage/progress)',
  ].join('\n')),
};
