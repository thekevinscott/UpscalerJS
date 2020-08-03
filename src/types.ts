export type WarmupSizes = [number, number][];
export interface IUpscalerOptions {
  model?: string;
  warmupSizes?: WarmupSizes;
}

export interface IUpscaleOptions {
  output?: 'src' | 'tensor';
  patchSize?: number;
  padding?: number;
  minimumPatchSize?: number;
}
