/**
 * Browser model loader for the ONNX backend.
 *
 * Counterpart to `packages/upscalerjs/src/browser/loadModel.browser.ts`.
 * Same CDN-fallback strategy — but the payload is a single `.onnx` file
 * rather than a `model.json` manifest referencing many weight shards.
 */
import type { InferenceSession, } from 'onnxruntime-common';
import type { LoadModel, ModelDefinition, ModelPackage, } from '../shared/types';
import { checkModelDefinition, parseModelDefinition, } from '../shared/model-utils';

type CDN = 'jsdelivr' | 'unpkg';
type CdnFn = (pkg: string, version: string, path: string) => string;

export const CDN_PATH_DEFINITIONS: Record<CDN, CdnFn> = {
  jsdelivr: (pkg, v, p) => `https://cdn.jsdelivr.net/npm/${pkg}@${v}/${p}`,
  unpkg:    (pkg, v, p) => `https://unpkg.com/${pkg}@${v}/${p}`,
};
export const CDNS: CDN[] = ['jsdelivr', 'unpkg',];

/**
 * Resolve an ONNX URL (CDN-fallback if needed), fetch the bytes, and build
 * an `InferenceSession`. Uses `onnxruntime-web` and lets the caller pick
 * the execution provider.
 */
const createSession = async (url: string, opts?: InferenceSession.SessionOptions): Promise<InferenceSession> => {
  const ort = await import('onnxruntime-web');
  // Prefer WebGPU when available, fall back to WASM. Matches the tfjs
  // backend story ("pick the best backend the browser exposes").
  const executionProviders = opts?.executionProviders ?? [
    'webgpu',
    'wasm',
  ] as InferenceSession.ExecutionProviderConfig[];
  return ort.InferenceSession.create(url, { ...opts, executionProviders, });
};

const fetchModel = async (def: ModelDefinition): Promise<InferenceSession> => {
  if (def.path) {
    return createSession(def.path);
  }
  if (!def._internals) { throw new Error('ModelDefinition missing `path` and `_internals`'); }
  const errs: Array<[CDN, Error,]> = [];
  for (const cdn of CDNS) {
    try {
      const url = CDN_PATH_DEFINITIONS[cdn](def._internals.name, def._internals.version, def._internals.path);
      return await createSession(url);
    } catch (err) {
      errs.push([cdn, err instanceof Error ? err : new Error(String(err)),]);
    }
  }
  throw new Error(`Could not load ${def._internals.name}@${def._internals.version}:\n${errs.map(([c, e,]) => `- ${c}: ${e.message}`).join('\n')}`);
};

export const loadModel: LoadModel = async (defPromise): Promise<ModelPackage> => {
  const def = await defPromise;
  checkModelDefinition(def);
  const parsed = parseModelDefinition(def);
  const session = await fetchModel(parsed);
  return { model: session, modelDefinition: parsed, };
};
