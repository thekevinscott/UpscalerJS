export enum State {
  NOT_STARTED,
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
