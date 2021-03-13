import * as tf from '@tensorflow/tfjs';
import { IUpscaleOptions, IModelDefinition } from './types';
export declare const getRowsAndColumns: (pixels: tf.Tensor3D | tf.Tensor4D, patchSize: number) => {
    rows: number;
    columns: number;
};
export declare const getTensorDimensions: (row: number, col: number, patchSize: number, padding: number | undefined, height: number, width: number) => {
    origin: [number, number];
    sliceOrigin: [number, number];
    size: [number, number];
    sliceSize: [number, number];
};
export declare const predict: (model: tf.LayersModel, pixels: tf.Tensor4D, modelDefinition: IModelDefinition, { progress, patchSize, padding }?: IUpscaleOptions) => Promise<tf.Tensor3D>;
declare const upscale: (model: tf.LayersModel, image: string | HTMLImageElement | tf.Tensor3D, modelDefinition: IModelDefinition, options?: IUpscaleOptions) => Promise<string | tf.Tensor<tf.Rank>>;
export default upscale;
