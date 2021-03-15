import * as tf from '@tensorflow/tfjs';
const SCALE = 4;
const BETA = 0.2;
const isTensorArray = (inputs) => {
    return Array.isArray(inputs);
};
const getInput = (inputs) => {
    if (isTensorArray(inputs)) {
        return inputs[0];
    }
    return inputs;
};
class MultiplyBeta extends tf.layers.Layer {
    constructor() {
        super({});
        this.beta = BETA;
    }
    call(inputs) {
        return tf.mul(getInput(inputs), this.beta);
    }
}
MultiplyBeta.className = 'MultiplyBeta';
class PixelShuffle extends tf.layers.Layer {
    constructor() {
        super({});
        this.scale = SCALE;
    }
    computeOutputShape(inputShape) {
        return [inputShape[0], inputShape[1], inputShape[2], 3];
    }
    call(inputs) {
        return tf.depthToSpace(getInput(inputs), this.scale, 'NHWC');
    }
}
PixelShuffle.className = 'PixelShuffle';
const config = {
    urlPath: 'idealo/gans',
    scale: 4,
    preprocess: (image) => tf.div(image, 255),
    postprocess: (output) => tf.mul(output.clipByValue(0, 1), 255),
    customLayers: [MultiplyBeta, PixelShuffle],
};
export default config;
