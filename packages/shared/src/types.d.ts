import * as tf from '@tensorflow/tfjs-core';
import type * as tfBrowser from '@tensorflow/tfjs';
import type * as tfNode from '@tensorflow/tfjs-node';
import type * as tfNodeGpu from '@tensorflow/tfjs-node-gpu';
import { Tensor, Tensor4D } from '@tensorflow/tfjs-core';
export type TF = typeof tfBrowser | typeof tfNode | typeof tfNodeGpu;
export type TFN = typeof tfNode | typeof tfNodeGpu;
export type OpExecutor = tfBrowser.OpExecutor | tfNode.OpExecutor | tfNodeGpu.OpExecutor;
export type GraphModel = tfBrowser.GraphModel | tfNode.GraphModel | tfNodeGpu.GraphModel;
export type ProcessFn<T extends Tensor> = (t: T) => T;
export interface ModelConfigurationInternals {
    name: string;
    version: string;
    path: string;
}
export type Range = [number, number];
type MetaValue = string | number | Meta | null | undefined | boolean;
export type Meta = {
    [key: string]: MetaValue;
};
export type ModelType = 'graph' | 'layers';
export type PreProcess = ProcessFn<Tensor4D>;
export type PostProcess = ProcessFn<Tensor4D>;
export type FixedShape4D = [null | number, number, number, number];
export type DynamicShape4D = [null | number, null, null, number];
export type Shape4D = FixedShape4D | DynamicShape4D;
export type Setup = (tf: TF) => (void | Promise<void>);
export type Teardown = (tf: TF) => (void | Promise<void>);
export interface ModelDefinition {
    modelType?: ModelType;
    path?: string;
    scale?: number;
    channels?: 3;
    _internals?: ModelConfigurationInternals;
    preprocess?: PreProcess;
    postprocess?: PostProcess;
    inputRange?: Range;
    outputRange?: Range;
    divisibilityFactor?: number;
    meta?: Meta;
    setup?: Setup;
    teardown?: Teardown;
}
export type ModelDefinitionFn = (tf: TF) => ModelDefinition;
export type ModelDefinitionObjectOrFn = ModelDefinitionFn | ModelDefinition;
export type IsTensor<T extends tf.Tensor> = (pixels: Tensor) => pixels is T;
export declare enum MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE {
    UNDEFINED = "undefined",
    INVALID_MODEL_TYPE = "invalidModelType",
    MISSING_PATH = "missingPath"
}
export {};
//# sourceMappingURL=types.d.ts.map