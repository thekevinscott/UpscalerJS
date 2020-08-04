export type WarmupSizes = [number, number][];
export interface IUpscalerOptions {
  model?: string;
  scale?: number;
  warmupSizes?: WarmupSizes;
}

export interface IUpscaleOptions {
  output?: 'src' | 'tensor';
  patchSize?: number;
  padding?: number;
  minimumPatchSize?: number;
}

export interface IModelDefinition {
  url: string;
  scale: number;
}
