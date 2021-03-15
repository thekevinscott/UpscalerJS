import * as tf from '@tensorflow/tfjs';
import { isHTMLImageElement, isString, isFourDimensionalTensor } from './utils';
export const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
});
export const getImageAsPixels = async (pixels) => {
    if (isString(pixels)) {
        const img = await loadImage(pixels);
        return {
            tensor: tf.browser.fromPixels(img).expandDims(0),
            type: 'string',
        };
    }
    if (isHTMLImageElement(pixels)) {
        return {
            tensor: tf.browser.fromPixels(pixels).expandDims(0),
            type: 'HTMLImageElement',
        };
    }
    if (isFourDimensionalTensor(pixels)) {
        return {
            tensor: pixels,
            type: 'tensor',
        };
    }
    if (pixels.shape.length === 3) {
        return {
            tensor: pixels.expandDims(0),
            type: 'tensor',
        };
    }
    throw new Error([
        `Unsupported dimensions for incoming pixels: ${pixels.shape.length}.`,
        'Only 3 or 4 dimension tensors are supported.',
    ].join(' '));
};
