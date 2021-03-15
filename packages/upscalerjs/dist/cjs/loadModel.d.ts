import * as tf from '@tensorflow/tfjs';
import { IUpscalerOptions, IModelDefinition } from './types';
export declare const warnDeprecatedModel: (key: string, nextKey: string, expirationVersion: string) => void;
export interface DeprecationWarnings {
    [index: string]: [string, string, string];
}
export declare const checkDeprecatedModels: (warnings: DeprecationWarnings, model: string) => void;
export declare const getModelDefinition: ({ model, scale, }?: IUpscalerOptions) => IModelDefinition;
declare const loadModel: (opts: IUpscalerOptions) => Promise<{
    model: tf.LayersModel;
    modelDefinition: IModelDefinition;
}>;
export default loadModel;
declare type ModelDefinitions = {
    [index: string]: IModelDefinition;
};
export declare const prepareModelDefinitions: (preparedModelDefinitions?: ModelDefinitions) => Promise<ModelDefinitions>;
export declare const getModelDefinitions: () => Promise<ModelDefinitions>;
export declare const getModelDescription: (val: IModelDefinition) => Promise<string>;
