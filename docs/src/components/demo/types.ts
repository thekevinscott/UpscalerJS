export enum State {
  BENCHMARKING,
  UPLOAD,
  WARNING,
  PROCESSING,
  COMPLETE,
}

export interface UploadedImage { 
  src: string; 
  filename: string; 
}

export interface ProcessedImage extends UploadedImage {
  el: HTMLImageElement;
}

export interface Size {
  width: number;
  height: number;
}

export type UpscaleChoice = 'original' | 'downscaled';
