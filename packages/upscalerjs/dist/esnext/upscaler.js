import loadModel, { getModelDefinitions } from './loadModel';
import warmup from './warmup';
import upscale from './upscale';
class Upscaler {
    constructor(opts = {}) {
        this.getModel = () => this._model;
        this.warmup = async (warmupSizes) => {
            await warmup(this._model, warmupSizes);
        };
        this.upscale = async (image, options = {}) => {
            const { model, modelDefinition } = await this._model;
            return upscale(model, image, modelDefinition, options);
        };
        this.getModelDefinitions = () => {
            return getModelDefinitions();
        };
        this._opts = {
            ...opts,
        };
        this._model = loadModel(this._opts);
        warmup(this._model, this._opts.warmupSizes || []);
    }
}
export default Upscaler;
