export enum State {
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
  el: HTMLCanvasElement;
}

export interface Size {
  width: number;
  height: number;
}

export type UpscaleChoice = 'original' | 'downscaled';
