import * as tf from '@tensorflow/tfjs';
export declare const isString: (pixels: any) => pixels is string;
export declare const isHTMLImageElement: (pixels: any) => pixels is HTMLImageElement;
export declare const isFourDimensionalTensor: (pixels: tf.Tensor) => pixels is tf.Tensor4D;
export declare const buildURL: (modelFolder: string) => string;
export declare const buildConfigURL: (modelFolder: string) => string;
export declare const warn: (msg: string | string[]) => void;
