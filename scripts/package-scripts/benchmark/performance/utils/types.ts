import type * as tfNode from '@tensorflow/tfjs-node';
import type * as tfNodeGpu from '@tensorflow/tfjs-node-gpu';

export interface DatasetDefinition {
  datasetName: string;
  datasetPath: string;
}

export type TF = typeof tfNode | typeof tfNodeGpu;
