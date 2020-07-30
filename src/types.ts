export interface IUpscalerOptions {
  model?: string;
  warmupSizes?: Array<[number, number]>;
}

export interface IUpscaleOptions {
  output?: 'src' | 'tensor';
}
