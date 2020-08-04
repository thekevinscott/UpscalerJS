export type WarmupSizes = [number, number][];
export interface IUpscalerOptions {
  model?: string;
  scale?: number;
  warmupSizes?: WarmupSizes;
}

export type Progress = (amount: number) => void;

export interface IUpscaleOptions {
  output?: 'src' | 'tensor';
  patchSize?: number;
  padding?: number;
  progress?: Progress;
}

export interface IModelDefinition {
  url: string;
  scale: number;
}
