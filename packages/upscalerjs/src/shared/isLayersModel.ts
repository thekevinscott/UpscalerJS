import { tf, } from './dependencies.generated';

export const isLayersModel = (model: tf.LayersModel | tf.GraphModel): model is tf.LayersModel => model instanceof tf.LayersModel;
