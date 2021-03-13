import * as tf from '@tensorflow/tfjs';
export declare const loadImage: (src: string) => Promise<HTMLImageElement>;
export declare const getImageAsPixels: (pixels: string | HTMLImageElement | tf.Tensor) => Promise<{
    tensor: tf.Tensor4D;
    type: 'string' | 'HTMLImageElement' | 'tensor';
}>;
